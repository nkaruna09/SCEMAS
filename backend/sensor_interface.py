import math
import logging
from datetime import datetime, timezone

from models.telemetry_reading import TelemetryReading

logger = logging.getLogger(__name__)


class SensorInterface:
    # validates raw sensor packets
    def __init__(self, sensor_id, sensor_type, telemetry_type, raw_data_value, city_location):
        self._sensor_id = sensor_id
        self._sensor_type = sensor_type
        self._telemetry_type = telemetry_type
        self._raw_data_value = raw_data_value
        self._city_location = city_location

    def validate_packet(self) -> bool:
        # check req fields
        if not self._sensor_id or not isinstance(self._sensor_id, str):
            self._display_sensor_interface_error("sensor_id is missing or not a string")
            return False
        if not self._sensor_type or not isinstance(self._sensor_type, str):
            self._display_sensor_interface_error("sensor_type is missing or not a string")
            return False
        if not self._telemetry_type or not isinstance(self._telemetry_type, str):
            self._display_sensor_interface_error("telemetry_type is missing or not a string")
            return False
        if not self._city_location or not isinstance(self._city_location, str):
            self._display_sensor_interface_error("city_location is missing or not a string")
            return False
        if self._raw_data_value is None:
            self._display_sensor_interface_error("raw_data_value is None")
            return False

        try:
            numeric_value = float(self._raw_data_value)
        except (TypeError, ValueError):
            self._display_sensor_interface_error(f"raw_data_value '{self._raw_data_value}' can't be float")
            return False
        if math.isnan(numeric_value) or math.isinf(numeric_value):
            self._display_sensor_interface_error(f"raw_data_value is NaN or Inf: {numeric_value}")
            return False
        return True

    def transmit_telemetry(self) -> TelemetryReading | None:
        # validate and package into a TelemetryReading return none f false
        if not self.validate_packet():
            return None
        return TelemetryReading(
            sensor_id=self._sensor_id,
            telemetry_type=self._telemetry_type,
            value=float(self._raw_data_value),
            city_location=self._city_location,
            timestamp=datetime.now(timezone.utc).isoformat(),
            is_valid=True,
        )

    def _display_sensor_interface_error(self, msg: str) -> None:
        logger.error(f"[SensorInterface] Validation failed for sensor '{self._sensor_id}': {msg}")
