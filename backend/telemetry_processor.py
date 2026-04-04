import math
import logging
import os

from supabase import create_client, Client
from dotenv import load_dotenv

from models.telemetry_reading import TelemetryReading

load_dotenv()
logger = logging.getLogger(__name__)


class TelemetryProcessor:
    #telemetry control layer, set ingestion pipeline, validate, store, then call alert eval and audit log control layers

    def __init__(self, alert_evaluator=None, audit_logger=None) -> None:
        self.ingestion_buffer: list[TelemetryReading] = []
        self._active_sensors: list[str] = []
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
        # References to other Control layer agents
        self._alert_evaluator = alert_evaluator
        self._audit_logger = audit_logger

    def receive_telemetry(self, reading: TelemetryReading) -> None:
        self.ingestion_buffer.append(reading)

        if reading.sensor_id not in self._active_sensors:
            self._active_sensors.append(reading.sensor_id)
            logger.info(f"[TelemetryProcessor] New sensor registered: {reading.sensor_id}")

        if self.validate_telemetry(reading):
            self.store_telemetry(reading)
            #PAC control layer -telemetryProcessor links calls to sibling agents
            if self._alert_evaluator:
                self._alert_evaluator.evaluate_data(reading)
            if self._audit_logger:
                self._audit_logger.log_telemetry_reading(reading)
            self.notify_dashboard()
        else:
            logger.warning(f"[TelemetryProcessor] Invalid reading from {reading.sensor_id}, skipping")

    def validate_telemetry(self, reading: TelemetryReading) -> bool:
        # validate after sensorreading
        if not reading.is_valid:
            return False
        if not reading.sensor_id or not isinstance(reading.sensor_id, str):
            return False
        if not reading.telemetry_type or not isinstance(reading.telemetry_type, str):
            return False
        if not reading.city_location or not isinstance(reading.city_location, str):
            return False
        if not isinstance(reading.value, (int, float)):
            return False
        if math.isnan(reading.value) or math.isinf(reading.value):
            return False
        return True

    def store_telemetry(self, reading: TelemetryReading) -> None:
        # insert into supabase db
        try:
            self._supabase.table("telemetry_readings").insert(reading.to_dict()).execute()
            logger.info(
                f"[TelemetryProcessor] Stored: sensor={reading.sensor_id} "
                f"type={reading.telemetry_type} value={reading.value}"
            )
        except Exception as exc:
            logger.error(f"[TelemetryProcessor] Failed to store reading: {exc}")

    def forward_alert(self, reading: TelemetryReading) -> None:
        # call when detect issue
        logger.info(f"[TelemetryProcessor] Alert forwarded for sensor={reading.sensor_id}")

    def notify_dashboard(self) -> None:
        logger.debug("[TelemetryProcessor] Dashboard notification hook called")

    def get_telemetry_type(self) -> str | None:
        if not self.ingestion_buffer:
            return None
        return self.ingestion_buffer[-1].telemetry_type

    def get_telemetry_values(self) -> list[float]:
        return [r.value for r in self.ingestion_buffer]

    def clear_buffer(self) -> None:
        self.ingestion_buffer.clear()
