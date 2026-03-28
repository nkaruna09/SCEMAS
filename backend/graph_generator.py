import base64
import io
from dataclasses import dataclass, field
from datetime import datetime
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server-side rendering
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from models.telemetry_reading import TelemetryReading


# Matches GraphData class from class diagram
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


# Matches abstract GraphGenerator class from class diagram
class GraphGenerator:
    def __init__(self):
        # Cache of recently generated graph data keyed by "metric_type:zone"
        self._graph_cache: dict[str, GraphData] = {}

    # Calculates aggregated graph data from a list of TelemetryReadings
    def calculate_graph_data(self, telemetry_data: list[TelemetryReading]) -> GraphData:
        if not telemetry_data:
            return GraphData(metric_type="unknown", zone="unknown")

        # Derive metric type and zone from the first reading
        metric_type = telemetry_data[0].get_type()
        zone = telemetry_data[0].get_zone()

        data_points = [r.get_value() for r in telemetry_data]
        timestamps = [r.get_timestamp() for r in telemetry_data]

        graph_data = GraphData(
            metric_type=metric_type,
            zone=zone,
            data_points=data_points,
            timestamps=timestamps,
        )

        # Cache the computed data for this metric/zone combination
        cache_key = f"{metric_type}:{zone}"
        self._graph_cache[cache_key] = graph_data

        return graph_data

    # Renders a matplotlib line chart and returns it as a base64-encoded PNG string
    def convert_to_visual_graph(self, data: GraphData) -> str:
        fig, ax = plt.subplots(figsize=(10, 4))

        # Parse ISO timestamps for proper x-axis formatting
        parsed_times = [datetime.fromisoformat(ts) for ts in data.get_timestamps()]

        ax.plot(parsed_times, data.get_data_points(), linewidth=1.5, color="#2563eb", marker="o", markersize=3)

        # Format x-axis as readable datetime labels
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())
        fig.autofmt_xdate()

        ax.set_title(f"{data.metric_type} — {data.zone}", fontsize=13)
        ax.set_xlabel("Time")
        ax.set_ylabel(data.metric_type)
        ax.grid(True, linestyle="--", alpha=0.5)

        plt.tight_layout()

        # Encode the figure as base64 PNG for transmission to the frontend
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=100)
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    # Packages and sends graph data — returns both the GraphData and the base64 PNG
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
