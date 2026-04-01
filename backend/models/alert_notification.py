from dataclasses import dataclass
from typing import Literal


@dataclass
class AlertNotification:
    # alert event created when a reading breaches a threshold
    alert_id: str
    sensor_id: str
    telemetry_type: str
    measurement: float
    threshold_value: float
    timestamp: str
    severity: Literal["low", "medium", "high", "critical"]
    rule_id: str = ""  # FK to alert_rules table

    def display_alert(self) -> None:
        # log the alert to stdout (UI rendering is done by the frontend)
        print(f"[ALERT] {self.get_alert_details()}")

    def acknowledge_alert(self) -> None:
        # log acknowledgement (frontend calls API to set status='acknowledged' in DB)
        print(f"[ACK] Alert {self.alert_id} acknowledged at {self.timestamp}")

    def get_alert_details(self) -> str:
        # human-readable summary for logging
        return (
            f"Alert {self.alert_id}: sensor={self.sensor_id} "
            f"type={self.telemetry_type} value={self.measurement} "
            f"threshold={self.threshold_value} severity={self.severity} "
            f"at {self.timestamp}"
        )

    def to_dict(self) -> dict:
        # pack for supabase insert
        return {
            "rule_id": self.rule_id or None,
            "sensor_id": self.sensor_id,
            "value": self.measurement,
            # status defaults to 'active' in DB
        }
