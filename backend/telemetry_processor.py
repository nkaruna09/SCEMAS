import os
from supabase import create_client, Client
from models.telemetry_reading import TelemetryReading


# Matches abstract TelemetryProcessor class from class diagram
class TelemetryProcessor:
    def __init__(self):
        # In-memory buffer holds readings received since last flush
        self.ingestion_buffer: list[TelemetryReading] = []
        # Tracks sensor IDs currently active and transmitting
        self._active_sensors: list[str] = []
        self._supabase: Client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

    # Accepts a reading, validates it, stores it, then forwards an alert if needed
    async def receive_telemetry(self, reading: TelemetryReading) -> None:
        self.ingestion_buffer.append(reading)

        # Register the sensor as active if first time seen
        if reading.sensor_id not in self._active_sensors:
            self._active_sensors.append(reading.sensor_id)

        if not self.validate_telemetry(reading):
            print(f"[TelemetryProcessor] Invalid reading from {reading.sensor_id} — skipping")
            return

        await self.store_telemetry(reading)

    # Returns True if the reading passes all sanity checks
    def validate_telemetry(self, reading: TelemetryReading) -> bool:
        if not reading.sensor_id or not reading.telemetry_type:
            return False
        if not isinstance(reading.value, (int, float)) or reading.value != reading.value:
            return False
        if not reading.timestamp:
            return False
        return reading.is_valid

    # Persists a validated reading to the Supabase telemetry_readings table
    async def store_telemetry(self, reading: TelemetryReading) -> None:
        result = self._supabase.table("telemetry_readings").insert(reading.to_dict()).execute()
        if hasattr(result, "error") and result.error:
            print(f"[TelemetryProcessor] Storage error: {result.error}")
        else:
            print(f"[TelemetryProcessor] Stored reading from {reading.sensor_id}")

    # Pushes a pending alert record to Supabase for the AlertEvaluator to pick up
    async def forward_alert(self, reading: TelemetryReading) -> None:
        payload = {
            "sensor_id": reading.sensor_id,
            "telemetry_type": reading.telemetry_type,
            "measurement": reading.value,
            "timestamp": reading.timestamp,
            "acknowledged": False,
        }
        result = self._supabase.table("alert_notifications").insert(payload).execute()
        if hasattr(result, "error") and result.error:
            print(f"[TelemetryProcessor] Alert forward error: {result.error}")

    # Signals the dashboard that new telemetry is available via Supabase Realtime
    async def notify_dashboard(self) -> None:
        # Supabase Realtime broadcasts row inserts automatically;
        # this hook exists for any additional fanout logic
        print("[TelemetryProcessor] Dashboard notified of new telemetry")

    # Returns the telemetry type of the most recently buffered reading
    def get_telemetry_type(self) -> str:
        if not self.ingestion_buffer:
            return ""
        return self.ingestion_buffer[-1].get_type()

    # Returns all numeric values currently held in the ingestion buffer
    def get_telemetry_values(self) -> list[float]:
        return [r.get_value() for r in self.ingestion_buffer]

    # Clears the ingestion buffer after a processing cycle
    def clear_buffer(self) -> None:
        self.ingestion_buffer = []
