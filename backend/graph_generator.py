import base64
import logging
from dataclasses import dataclass, field
from io import BytesIO
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

from models.telemetry_reading import TelemetryReading

logger = logging.getLogger(__name__)


@dataclass
class GraphData:
    metric_type: str
    zone: str
    data_points: list[float] = field(default_factory=list)
    timestamps: list[str] = field(default_factory=list)

    def get_data_points(self) -> list[float]:
        return self.data_points

    def get_timestamps(self) -> list[str]:
        return self.timestamps


class GraphGenerator:

    def __init__(self) -> None:
        self._graph_cache: dict[str, GraphData] = {}

    def calculate_graph_data(self, telemetry_data: list[TelemetryReading]) -> GraphData:
        if not telemetry_data:
            return GraphData(metric_type="unknown", zone="unknown")

        first = telemetry_data[0]
        metric_type = first.get_type()
        zone = first.get_zone()
        cache_key = f"{metric_type}:{zone}"

        data = GraphData(
            metric_type=metric_type,
            zone=zone,
            data_points=[r.get_value() for r in telemetry_data],
            timestamps=[r.get_timestamp() for r in telemetry_data],
        )
        self._graph_cache[cache_key] = data
        return data

    def convert_to_visual_graph(self, data: GraphData) -> str:
        # render line chart using matplotlib, return base64 PNG string
        fig, ax = plt.subplots(figsize=(10, 4))

        try:
            # parse timestamps for proper x-axis formatting
            parsed_times = [datetime.fromisoformat(ts) for ts in data.timestamps]
            ax.plot(parsed_times, data.data_points, linewidth=1.5, color="#3b82f6", marker="o", markersize=3)
            ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
            fig.autofmt_xdate()
        except (ValueError, TypeError):
            # fall back to index-based x-axis if timestamps can't be parsed
            ax.plot(data.data_points, linewidth=1.5, color="#3b82f6", marker="o", markersize=3)

        ax.set_title(f"{data.metric_type} — {data.zone}", fontsize=12)
        ax.set_ylabel(data.metric_type)
        ax.set_xlabel("Time")
        ax.grid(True, alpha=0.3)
        fig.tight_layout()

        buf = BytesIO()
        fig.savefig(buf, format="png", dpi=100)
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def send_graph_data(self, telemetry_data: list[TelemetryReading]) -> dict:
        graph_data = self.calculate_graph_data(telemetry_data)
        image_b64 = self.convert_to_visual_graph(graph_data)

        return {
            "metric_type": graph_data.metric_type,
            "zone": graph_data.zone,
            "data_points": graph_data.get_data_points(),
            "timestamps": graph_data.get_timestamps(),
            "image_b64": image_b64,
        }
