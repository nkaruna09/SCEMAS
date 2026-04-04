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
from audit_logger import AuditLogger
from report_generator import ReportGenerator
from account_management import AccountManagement
from graph_generator import GraphGenerator
from models.telemetry_reading import TelemetryReading
from mock_telemetry_generator import generate_mock_batch, generate_alert_packet

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# singleton instances shared across requests (Control layer agents)
audit_logger = AuditLogger()
evaluator = AlertEvaluator()
report_gen = ReportGenerator()
account_mgmt = AccountManagement(audit_logger=audit_logger)
processor = TelemetryProcessor(alert_evaluator=evaluator, audit_logger=audit_logger)
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


class AlertRuleRequest(BaseModel):
    """Request model for creating/updating alert rules."""
    metric_type: str
    threshold_value: float
    operator: str  # '>', '<', '>=', '<=', '='
    severity: str  # 'low', 'medium', 'high', 'critical'


class AlertStatusUpdate(BaseModel):
    """Request model for updating alert status."""
    status: str  # 'acknowledged', 'resolved'

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/telemetry/ingest")
def ingest(payload: IngestPayload, x_api_key: str = Header(default="")):
#Telemetry ingestion endpoint, wrapper around Presentation boundary
    expected_key = os.getenv("SENSOR_API_KEY", "")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # validate raw input through Presentation boundary
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

#alert rule mgmt endpoint
@app.post("/alert-rules")
def create_alert_rule(rule: AlertRuleRequest):
#make new alrt rule
    try:
        result = evaluator.create_alert_rule(rule)
        if result is None:
            raise HTTPException(status_code=400, detail="Failed to create alert rule")
        return result
    except Exception as exc:
        logger.error(f"[main] Failed to create alert rule: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.put("/alert-rules/{rule_id}")
def update_alert_rule(rule_id: str, rule: AlertRuleRequest):
    try:
        result = evaluator.update_alert_rule(rule_id, rule)
        if result is None:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        return result
    except Exception as exc:
        logger.error(f"[main] Failed to update alert rule: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.delete("/alert-rules/{rule_id}")
def delete_alert_rule(rule_id: str):
    try:
        success = evaluator.delete_alert_rule(rule_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        return {"success": True, "rule_id": rule_id}
    except Exception as exc:
        logger.error(f"[main] Failed to delete alert rule: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
#lert status endpoints
@app.patch("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    try:
        success = evaluator.update_alert_status(alert_id, "acknowledged")
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"success": True, "alert_id": alert_id, "status": "acknowledged"}
    except Exception as exc:
        logger.error(f"[main] Failed to acknowledge alert: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    try:
        success = evaluator.update_alert_status(alert_id, "resolved")
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"success": True, "alert_id": alert_id, "status": "resolved"}
    except Exception as exc:
        logger.error(f"[main] Failed to resolve alert: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

#audit log retrieveal endpoint
@app.get("/audit")
def get_audit_logs(
    table: str = None,
    action: str = None,
    limit: int = 200,
):
    try:
        logs = audit_logger.retrieve_logs(table_filter=table, action_filter=action, limit=limit)
        return {"entries": logs, "count": len(logs)}
    except Exception as exc:
        logger.error(f"[main] Failed to retrieve audit logs: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/reports")
def get_reports(limit: int = 10):
    try:
        reports = report_gen.get_recent_reports(limit=limit)
        return {"reports": reports, "count": len(reports)}
    except Exception as exc:
        logger.error(f"[main] Failed to retrieve reports: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


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
