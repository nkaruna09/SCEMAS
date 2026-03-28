from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
from .graph_utils import generate_line_graph, save_graph_to_file  # Use relative import
import os

app = FastAPI()

# Directory to save generated graphs
GRAPH_DIR = "generated_graphs"
os.makedirs(GRAPH_DIR, exist_ok=True)

class GraphRequest(BaseModel):
    sensor_id: str
    data: List[Dict]

@app.post("/generate-graph/")
async def generate_graph(request: GraphRequest):
    try:
        graph = generate_line_graph(request.data)
        filename = f"{GRAPH_DIR}/graph_{request.sensor_id}.png"
        save_graph_to_file(graph, filename)
        return FileResponse(filename, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating graph: {str(e)}")