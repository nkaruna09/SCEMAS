import logging
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

from models.telemetry_reading import TelemetryReading
from models.alert_notification import AlertNotification

load_dotenv()
logger = logging.getLogger(__name__)


class AuditLogger:
    def __init__(self) -> None:
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

    def log_telemetry_reading(self, reading: TelemetryReading) -> None:
        try:
            audit_entry = {
                "user_id": None,
                "action": "INSERT",
                "table_name": "telemetry_readings",
                "new_val": reading.to_dict(),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
            self._supabase.table("audit_log").insert(audit_entry).execute()
            logger.info(f"[AuditLogger] Logged telemetry reading: {reading.sensor_id}")
        except Exception as exc:
            logger.error(f"[AuditLogger] Failed to log telemetry reading: {exc}")

    def log_alert_event(self, alert: AlertNotification, action: str = "INSERT") -> None:
        try:
            audit_entry = {
                "user_id": None,
                "action": action,
                "table_name": "alerts",
                "new_val": alert.to_dict(),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
            self._supabase.table("audit_log").insert(audit_entry).execute()
            logger.info(f"[AuditLogger] Logged alert event: {alert.alert_id}")
        except Exception as exc:
            logger.error(f"[AuditLogger] Failed to log alert event: {exc}")

    def log_account_event(
        self, user_id: str, action: str, table_name: str, old_val=None, new_val=None
    ) -> None:
        try:
            audit_entry = {
                "user_id": user_id,
                "action": action,
                "table_name": table_name,
                "old_val": old_val,
                "new_val": new_val,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
            self._supabase.table("audit_log").insert(audit_entry).execute()
            logger.info(f"[AuditLogger] Logged account event for user {user_id}")
        except Exception as exc:
            logger.error(f"[AuditLogger] Failed to log account event: {exc}")

    def retrieve_logs(
        self, table_filter: str = None, action_filter: str = None, limit: int = 200
    ) -> list:
        try:
            query = self._supabase.table("audit_log").select("*")
            if table_filter:
                query = query.eq("table_name", table_filter)
            if action_filter:
                query = query.eq("action", action_filter)
            query = query.order("timestamp", desc=True).limit(limit)
            response = query.execute()
            logger.info(f"[AuditLogger] Retrieved {len(response.data)} audit log entries")
            return response.data
        except Exception as exc:
            logger.error(f"[AuditLogger] Failed to retrieve audit logs: {exc}")
            return []
