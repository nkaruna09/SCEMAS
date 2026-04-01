import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
from dotenv import load_dotenv

import matplotlib.pyplot as plt
from graph_utils import generate_line_graph

from sensor_interface import SensorInterface
from telemetry_processor import TelemetryProcessor
from alert_evaluator import AlertEvaluator
from graph_generator import GraphGenerator
from models.telemetry_reading import TelemetryReading
from mock_telemetry_generator import generate_mock_batch, generate_alert_packet

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# singleton instances shared across requests
processor = TelemetryProcessor()
evaluator = AlertEvaluator()
graph_gen = GraphGenerator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[SCEMAS] Starting up — loading alert rules …")
    evaluator.load_alert_rules()
    logger.info("[SCEMAS] Ready")
    yield
    logger.info("[SCEMAS] Shutting down")


app = FastAPI(title="SCEMAS Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GRAPH_DIR = "generated_graphs"
os.makedirs(GRAPH_DIR, exist_ok=True)
class IngestPayload(BaseModel):
    sensor_id: str
    sensor_type: str
    telemetry_type: str
    raw_data_value: float
    city_location: str
class GraphRequest(BaseModel):
    readings: list[dict]
class LegacyGraphRequest(BaseModel):
    sensor_id: str
    data: List[Dict]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/telemetry/ingest")
def ingest(payload: IngestPayload, x_api_key: str = Header(default="")):
    # main pipeline: SensorInterface → TelemetryProcessor → AlertEvaluator → dashboard
    expected_key = os.getenv("SENSOR_API_KEY", "")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # validate raw input
    interface = SensorInterface(
        sensor_id=payload.sensor_id,
        sensor_type=payload.sensor_type,
        telemetry_type=payload.telemetry_type,
        raw_data_value=payload.raw_data_value,
        city_location=payload.city_location,
    )
    reading = interface.transmit_telemetry()
    if reading is None:
        raise HTTPException(status_code=422, detail="Sensor packet failed validation")

    # store, evaluate, notify
    processor.receive_telemetry(reading)
    evaluator.evaluate_data(reading)
    processor.notify_dashboard()

    return {"success": True, "sensor_id": reading.sensor_id, "timestamp": reading.timestamp}


@app.post("/graphs/generate")
def generate_graph(request: GraphRequest):
    # reconstruct TelemetryReading objects and generate a graph
    if not request.readings:
        raise HTTPException(status_code=400, detail="No readings provided")

    readings = []
    for r in request.readings:
        try:
            readings.append(
                TelemetryReading(
                    sensor_id=r["sensor_id"],
                    telemetry_type=r.get("telemetry_type") or r.get("metric_type", ""),
                    value=float(r["value"]),
                    city_location=r.get("city_location") or r.get("zone_id", ""),
                    timestamp=r.get("timestamp", ""),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid reading: {exc}")
    return graph_gen.send_graph_data(readings)


@app.post("/generate-graph/")
async def generate_graph_legacy(request: LegacyGraphRequest):
    try:
        fig, ax = plt.subplots(figsize=(8, 4))
        x = [item['x'] for item in request.data]
        y = [item['y'] for item in request.data]
        ax.plot(x, y, marker='o')
        ax.set_title(f"Sensor {request.sensor_id}")
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        ax.grid()
        filename = f"{GRAPH_DIR}/graph_{request.sensor_id}.png"
        fig.savefig(filename)
        plt.close(fig)
        return FileResponse(filename, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/telemetry/mock")
def mock_batch(count: int = 10):
    # return a batch of mock sensor packets for testing
    count = max(1, min(count, 100))
    return {"packets": generate_mock_batch(count)}


@app.get("/telemetry/mock/alert")
def mock_alert(sensor_type: str | None = None, telemetry_type: str | None = None):
    # return one guaranteed over-threshold packet to test the alert pipeline
    packet = generate_alert_packet(sensor_type=sensor_type, telemetry_type=telemetry_type)
    return {"packet": packet}
