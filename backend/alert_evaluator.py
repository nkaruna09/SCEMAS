import logging
import os
import uuid
from datetime import datetime, timezone

from supabase import create_client, Client
from dotenv import load_dotenv

from models.telemetry_reading import TelemetryReading
from models.alert_rule import AlertRule
from models.alert_notification import AlertNotification

load_dotenv()
logger = logging.getLogger(__name__)


class AlertEvaluator:
    def __init__(self) -> None:
        self._active_rules: dict[str, list[AlertRule]] = {}
        self._alert_severity: str = ""
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

    def load_alert_rules(self) -> None:
        try:
            response = self._supabase.table("alert_rules").select("*").execute()
            self._active_rules.clear()
            for row in response.data:
                rule = AlertRule(
                    id=row["id"],
                    metric_type=row["metric_type"],
                    threshold_value=float(row["threshold_value"]),
                    operator=row["operator"],
                    severity=row["severity"],
                )
                self._active_rules.setdefault(rule.metric_type, []).append(rule)
            logger.info(
                f"[AlertEvaluator] Loaded {sum(len(v) for v in self._active_rules.values())} "
                f"rules across {len(self._active_rules)} metric types"
            )
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to load alert rules: {exc}")

    def evaluate_data(self, reading: TelemetryReading) -> None:
        rules = self._active_rules.get(reading.telemetry_type)
        if not rules:
            logger.debug(f"[AlertEvaluator] No rules for '{reading.telemetry_type}', skipping")
            return

        for rule in rules:
            breached = not self.check_alert_rules(reading.value, reading.telemetry_type, rule)
            if breached:
                self._notify_threshold_exceeded(reading, rule)
            else:
                logger.info(
                    f"[AlertEvaluator] Within threshold: sensor={reading.sensor_id} value={reading.value}"
                )

    def check_alert_rules(self, value: float, telemetry_type: str, rule: AlertRule) -> bool:
        op = rule.operator
        t = rule.threshold_value
        if op == ">":   return not (value > t)
        if op == "<":   return not (value < t)
        if op == ">=":  return not (value >= t)
        if op == "<=":  return not (value <= t)
        if op == "=":   return not (value == t)
        logger.warning(f"[AlertEvaluator] Unknown operator '{op}' in rule {rule.id}")
        return True

    def monitor_alert_severity(self, value: float, rule: AlertRule) -> str:
        delta = abs(value - rule.threshold_value)
        if delta <= 5:   return "low"
        if delta <= 15:  return "medium"
        if delta <= 30:  return "high"
        return "critical"

    def trigger_alert(self, alert: AlertNotification) -> None:
        try:
            self._supabase.table("alerts").insert(alert.to_dict()).execute()
            alert.display_alert()
            logger.info(f"[AlertEvaluator] Alert triggered: {alert.alert_id}")
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to insert alert: {exc}")

    def notify_threshold_exceeded(self) -> None:
        logger.info("[AlertEvaluator] Threshold exceeded — notification dispatched")

    def _notify_threshold_exceeded(self, reading: TelemetryReading, rule: AlertRule) -> None:
        # Deduplicate: skip if any active/acknowledged alert already exists for this
        # sensor+metric_type. Checks all rules sharing the metric type to prevent one
        # alert per rule when multiple rules cover the same metric.
        try:
            metric_rule_ids = [
                r.id for r in self._active_rules.get(rule.metric_type, [])
            ]
            existing = (
                self._supabase.table("alerts")
                .select("id")
                .eq("sensor_id", reading.sensor_id)
                .in_("rule_id", metric_rule_ids)
                .in_("status", ["active", "acknowledged"])
                .limit(1)
                .execute()
            )
            if existing.data:
                logger.info(
                    f"[AlertEvaluator] Alert already active for sensor={reading.sensor_id} "
                    f"metric={rule.metric_type}, skipping duplicate"
                )
                return
        except Exception as exc:
            logger.warning(f"[AlertEvaluator] Could not check existing alerts: {exc}")

        severity = self.monitor_alert_severity(reading.value, rule)
        self._alert_severity = severity
        alert = AlertNotification(
            alert_id=str(uuid.uuid4()),
            sensor_id=reading.sensor_id,
            telemetry_type=reading.telemetry_type,
            measurement=reading.value,
            threshold_value=rule.threshold_value,
            timestamp=datetime.now(timezone.utc).isoformat(),
            severity=severity,
            rule_id=rule.id,
        )
        self.trigger_alert(alert)
        self.notify_threshold_exceeded()

    def create_alert_rule(self, rule_data) -> dict:
        try:
            if not rule_data.metric_type or not rule_data.operator or not rule_data.severity:
                return None

            rule_id = str(uuid.uuid4())
            rule_dict = {
                "id": rule_id,
                "metric_type": rule_data.metric_type,
                "threshold_value": float(rule_data.threshold_value),
                "operator": rule_data.operator,
                "severity": rule_data.severity,
            }
            self._supabase.table("alert_rules").insert(rule_dict).execute()
            rule = AlertRule(
                id=rule_id,
                metric_type=rule_data.metric_type,
                threshold_value=float(rule_data.threshold_value),
                operator=rule_data.operator,
                severity=rule_data.severity,
            )
            self._active_rules.setdefault(rule.metric_type, []).append(rule)
            logger.info(f"[AlertEvaluator] Created alert rule: {rule_id}")
            return rule_dict
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to create alert rule: {exc}")
            return None

    def update_alert_rule(self, rule_id: str, rule_data) -> dict:
        try:
            if not rule_data.metric_type or not rule_data.operator or not rule_data.severity:
                return None
            rule_dict = {
                "metric_type": rule_data.metric_type,
                "threshold_value": float(rule_data.threshold_value),
                "operator": rule_data.operator,
                "severity": rule_data.severity,
            }
            response = (
                self._supabase.table("alert_rules")
                .update(rule_dict)
                .eq("id", rule_id)
                .execute()
            )
            if not response.data:
                logger.warning(f"[AlertEvaluator] Alert rule not found: {rule_id}")
                return None

            self.load_alert_rules()
            logger.info(f"[AlertEvaluator] Updated alert rule: {rule_id}")
            return rule_dict
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to update alert rule: {exc}")
            return None

    def delete_alert_rule(self, rule_id: str) -> bool:
        try:
            response = (
                self._supabase.table("alert_rules").delete().eq("id", rule_id).execute()
            )
            if not response.data:
                logger.warning(f"[AlertEvaluator] Alert rule not found: {rule_id}")
                return False
            self.load_alert_rules()
            logger.info(f"[AlertEvaluator] Deleted alert rule: {rule_id}")
            return True
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to delete alert rule: {exc}")
            return False

    def update_alert_status(self, alert_id: str, status: str) -> bool:
        try:
            if status not in ["acknowledged", "resolved"]:
                logger.warning(f"[AlertEvaluator] Invalid status: {status}")
                return False
            update_dict = {"status": status}
            if status == "resolved":
                update_dict["resolved_at"] = datetime.now(timezone.utc).isoformat()
            response = (
                self._supabase.table("alerts")
                .update(update_dict)
                .eq("id", alert_id)
                .execute()
            )
            if not response.data:
                logger.warning(f"[AlertEvaluator] Alert not found: {alert_id}")
                return False
            logger.info(f"[AlertEvaluator] Updated alert {alert_id} status to {status}")
            return True
        except Exception as exc:
            logger.error(f"[AlertEvaluator] Failed to update alert status: {exc}")
            return False
