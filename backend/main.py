from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
from .graph_utils import generate_line_graph, save_graph_to_file  # Use relative import
import os
from fastapi.middleware.cors import CORSMiddleware
import matplotlib.pyplot as plt 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory to save generated graphs
GRAPH_DIR = "generated_graphs"
os.makedirs(GRAPH_DIR, exist_ok=True)

class GraphRequest(BaseModel):
    sensor_id: str
    data: List[Dict]

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import matplotlib.pyplot as plt
import os

app = FastAPI()

# ✅ CORS (required)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAPH_DIR = "generated_graphs"
os.makedirs(GRAPH_DIR, exist_ok=True)

class GraphRequest(BaseModel):
    sensor_id: str
    data: List[Dict]

@app.post("/generate-graph/")
async def generate_graph(request: GraphRequest):
    try:
        # ✅ Create figure properly
        fig, ax = plt.subplots(figsize=(8, 4))

        x = [item['x'] for item in request.data]
        y = [item['y'] for item in request.data]

        ax.plot(x, y, marker='o')
        ax.set_title(f"Sensor {request.sensor_id}")
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        ax.grid()

        filename = f"{GRAPH_DIR}/graph_{request.sensor_id}.png"

        # ✅ Save figure
        fig.savefig(filename)
        plt.close(fig)

        return FileResponse(filename, media_type="image/png")

    except Exception as e:
        print("❌ Backend error:", e)
        raise HTTPException(status_code=500, detail=str(e))