from dataclasses import dataclass, field
from datetime import datetime


# Matches TelemetryReading class from class diagram
@dataclass
class TelemetryReading:
    sensor_id: str
    telemetry_type: str
    value: float
    city_location: str
    timestamp: str
    is_valid: bool = True

    # Returns the raw numeric telemetry value
    def get_value(self) -> float:
        return self.value

    # Returns the telemetry type string identifier
    def get_type(self) -> str:
        return self.telemetry_type

    # Returns the city zone / location identifier
    def get_zone(self) -> str:
        return self.city_location

    # Returns the ISO 8601 timestamp string
    def get_timestamp(self) -> str:
        return self.timestamp

    # Serialises to a plain dict for JSON responses or Supabase insertion
    # def to_dict(self) -> dict:
    #     return {
    #         "sensor_id": self.sensor_id,
    #         "telemetry_type": self.telemetry_type,
    #         "value": self.value,
    #         "city_location": self.city_location,
    #         "timestamp": self.timestamp,
    #         "is_valid": self.is_valid,
    #     }
    def to_dict(self):
        return {
            "sensor_id": self.sensor_id,   # still string for now
            "zone_id": self.city_location, # TEMP: treat zone name as ID
            "metric_type": self.telemetry_type,
            "value": self.value,
            "timestamp": self.timestamp,
        }
