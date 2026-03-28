from datetime import datetime, timezone
from models.telemetry_reading import TelemetryReading


# Matches SensorInterface class from class diagram
class SensorInterface:
    def __init__(self, sensor_id: str, sensor_type: str, telemetry_type: str,
                 raw_data_value: float, city_location: str):
        self._sensor_id = sensor_id
        self._sensor_type = sensor_type
        self._telemetry_type = telemetry_type
        self._raw_data_value = raw_data_value
        self._city_location = city_location

    # Validates the packet fields and numeric value before transmission
    def validate_packet(self) -> bool:
        if not self._sensor_id or not self._sensor_type or not self._telemetry_type:
            return False
        if not isinstance(self._raw_data_value, (int, float)):
            return False
        if self._raw_data_value != self._raw_data_value:
            # NaN check
            return False
        if not self._city_location:
            return False
        return True

    # Constructs a validated TelemetryReading; returns None if validation fails
    def transmit_telemetry(self) -> TelemetryReading | None:
        if not self.validate_packet():
            self._display_sensor_interface_error(
                f"Packet validation failed for sensor {self._sensor_id}"
            )
            return None

        return TelemetryReading(
            sensor_id=self._sensor_id,
            telemetry_type=self._telemetry_type,
            value=float(self._raw_data_value),
            city_location=self._city_location,
            timestamp=datetime.now(timezone.utc).isoformat(),
            is_valid=True,
        )

    # Logs sensor interfacing errors; maps to displaySensorInterfaceError in class diagram
    def _display_sensor_interface_error(self, msg: str) -> None:
        print(f"[SensorInterface][{self._sensor_id}] ERROR: {msg}")
