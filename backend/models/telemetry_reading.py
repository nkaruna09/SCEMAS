from dataclasses import dataclass, field


@dataclass
class TelemetryReading:
    # single measurement from one sensor at one point in time
    sensor_id: str
    telemetry_type: str  # what's being measured (pm2_5, temperature_c, etc)
    value: float
    city_location: str  # the zone this sensor belongs to
    timestamp: str  # ISO 8601 UTC
    is_valid: bool = field(default=True)

    # accessors
    def get_value(self) -> float:
        return self.value

    def get_type(self) -> str:
        return self.telemetry_type

    def get_zone(self) -> str:
        return self.city_location

    def get_timestamp(self) -> str:
        return self.timestamp

    # pack into a dict for supabase
    def to_dict(self) -> dict:
        return {
            "sensor_id": self.sensor_id,
            "zone_id": self.city_location,
            "metric_type": self.telemetry_type,
            "value": self.value,
            "timestamp": self.timestamp,
        }
