import os
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client
from models.telemetry_reading import TelemetryReading
from models.alert_rule import AlertRule
from models.alert_notification import AlertNotification


# Matches abstract AlertEvaluator class from class diagram
class AlertEvaluator:
    def __init__(self):
        # In-memory cache of active rules keyed by sensor_id for fast lookup
        self._active_rules: dict[str, AlertRule] = {}
        self._alert_severity: str = "none"
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

    # Loads all alert rules from Supabase into the local cache
    async def load_alert_rules(self) -> None:
        result = self._supabase.table("alert_rules").select("*").execute()
        self._active_rules.clear()
        for row in result.data or []:
            self._active_rules[row["sensor_id"]] = AlertRule(
                sensor_id=row["sensor_id"],
                upper_limit=row["upper_limit"],
                lower_limit=row["lower_limit"],
            )
        print(f"[AlertEvaluator] Loaded {len(self._active_rules)} alert rules")

    # Evaluates a reading against its rule; triggers an alert if any threshold is breached
    async def evaluate_data(self, reading: TelemetryReading) -> None:
        rule = self._active_rules.get(reading.sensor_id)
        if not rule:
            print(f"[AlertEvaluator] No rule for sensor {reading.sensor_id} — skipping")
            return

        within = self.check_alert_rules(reading.value, reading.telemetry_type, rule)
        if not within:
            await self._notify_threshold_exceeded(reading, rule)
        else:
            print(f"[AlertEvaluator] {reading.sensor_id} within threshold — continuing monitoring")

    # Returns True when the value is within the rule's upper and lower bounds
    def check_alert_rules(self, value: float, telemetry_type: str, rule: AlertRule) -> bool:
        return rule.lower_limit <= value <= rule.upper_limit

    # Derives a severity label based on how far the value deviates past the nearest limit
    def monitor_alert_severity(self, value: float, rule: AlertRule) -> str:
        upper_delta = value - rule.upper_limit
        lower_delta = rule.lower_limit - value
        delta = max(upper_delta, lower_delta)

        if delta <= 0:
            return "none"
        if delta < 5:
            return "low"
        if delta < 15:
            return "medium"
        if delta < 30:
            return "high"
        return "critical"

    # Persists a fully constructed AlertNotification to the Supabase alerts table
    async def trigger_alert(self, alert: AlertNotification) -> None:
        result = self._supabase.table("alert_notifications").insert(alert.to_dict()).execute()
        if hasattr(result, "error") and result.error:
            print(f"[AlertEvaluator] Failed to store alert: {result.error}")
        else:
            alert.display_alert()

    # Signals that a threshold has been exceeded; builds and dispatches the alert
    async def notify_threshold_exceeded(self) -> None:
        # Called internally after _notify_threshold_exceeded constructs the alert
        print("[AlertEvaluator] Threshold exceeded — alert dispatched")

    # Internal helper: builds the AlertNotification and calls trigger_alert
    async def _notify_threshold_exceeded(self, reading: TelemetryReading, rule: AlertRule) -> None:
        breached_limit = rule.upper_limit if reading.value > rule.upper_limit else rule.lower_limit
        severity = self.monitor_alert_severity(reading.value, rule)
        self._alert_severity = severity

        alert = AlertNotification(
            alert_id=str(uuid.uuid4()),
            sensor_id=reading.sensor_id,
            telemetry_type=reading.telemetry_type,
            measurement=reading.value,
            threshold_value=breached_limit,
            timestamp=datetime.now(timezone.utc).isoformat(),
            severity=severity,
        )
        await self.trigger_alert(alert)
        await self.notify_threshold_exceeded()
