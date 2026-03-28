from dataclasses import dataclass
from typing import Literal


# Matches AlertNotification class from class diagram
@dataclass
class AlertNotification:
    alert_id: str
    sensor_id: str
    telemetry_type: str
    measurement: float
    threshold_value: float
    timestamp: str
    severity: Literal["low", "medium", "high", "critical"]

    # Logs the alert to stdout — display logic is handled by the frontend
    def display_alert(self) -> None:
        print(f"[ALERT] {self.sensor_id} | {self.telemetry_type}: {self.measurement} "
              f"(threshold: {self.threshold_value}) | severity: {self.severity}")

    # Marks the alert as acknowledged; persistence is handled by the caller
    def acknowledge_alert(self) -> None:
        print(f"[ALERT ACKNOWLEDGED] {self.alert_id}")

    # Returns a human-readable summary string for logging or API responses
    def get_alert_details(self) -> str:
        return (f"Alert {self.alert_id}: sensor={self.sensor_id}, "
                f"type={self.telemetry_type}, value={self.measurement}, "
                f"threshold={self.threshold_value}, severity={self.severity}, "
                f"timestamp={self.timestamp}")

    # Serialises to dict for Supabase insertion or JSON response
    def to_dict(self) -> dict:
        return {
            "alert_id": self.alert_id,
            "sensor_id": self.sensor_id,
            "telemetry_type": self.telemetry_type,
            "measurement": self.measurement,
            "threshold_value": self.threshold_value,
            "timestamp": self.timestamp,
            "severity": self.severity,
            "acknowledged": False,
        }
