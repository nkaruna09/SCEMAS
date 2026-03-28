import random
import uuid
from datetime import datetime, timezone


# Maps each sensor type to the telemetry types it can emit
SENSOR_TELEMETRY_MAP: dict[str, list[str]] = {
    "air_quality": ["pm2_5", "pm10", "co2"],
    "temperature": ["temperature_c"],
    "humidity": ["humidity_pct"],
    "noise": ["noise_db"],
    "water_quality": ["ph", "turbidity"],
    "traffic": ["vehicle_count"],
}

# Realistic value ranges per telemetry type
VALUE_RANGES: dict[str, dict[str, float]] = {
    "pm2_5":         {"min": 0,   "max": 250},
    "pm10":          {"min": 0,   "max": 400},
    "co2":           {"min": 300, "max": 5000},
    "temperature_c": {"min": -20, "max": 45},
    "humidity_pct":  {"min": 0,   "max": 100},
    "noise_db":      {"min": 30,  "max": 120},
    "ph":            {"min": 0,   "max": 14},
    "turbidity":     {"min": 0,   "max": 100},
    "vehicle_count": {"min": 0,   "max": 500},
}

# City zone identifiers drawn from the SCEMAS zone model
CITY_ZONES = [
    "zone_downtown",
    "zone_industrial",
    "zone_residential_north",
    "zone_residential_south",
    "zone_waterfront",
    "zone_transit_hub",
]


# Generates a single mock sensor packet with randomised values within realistic ranges
def generate_mock_packet(overrides: dict | None = None) -> dict:
    overrides = overrides or {}
    sensor_type = overrides.get("sensor_type", random.choice(list(SENSOR_TELEMETRY_MAP)))
    telemetry_type = overrides.get("telemetry_type", random.choice(SENSOR_TELEMETRY_MAP[sensor_type]))
    r = VALUE_RANGES[telemetry_type]
    raw_value = round(random.uniform(r["min"], r["max"]), 2)

    return {
        "sensor_id": overrides.get("sensor_id", f"sensor_{sensor_type}_{random.randint(0, 99)}"),
        "sensor_type": sensor_type,
        "telemetry_type": telemetry_type,
        "raw_data_value": overrides.get("raw_data_value", raw_value),
        "city_location": overrides.get("city_location", random.choice(CITY_ZONES)),
        "timestamp": overrides.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }


# Generates a batch of mock packets — useful for load testing the ingestion endpoint
def generate_mock_batch(count: int = 10) -> list[dict]:
    return [generate_mock_packet() for _ in range(count)]


# Generates a packet guaranteed to exceed the upper threshold to exercise alert paths
def generate_alert_packet(sensor_type: str = "air_quality",
                          telemetry_type: str = "pm2_5") -> dict:
    # Adds 50 on top of max to ensure any typical upper limit is breached
    max_val = VALUE_RANGES[telemetry_type]["max"]
    return generate_mock_packet({
        "sensor_type": sensor_type,
        "telemetry_type": telemetry_type,
        "raw_data_value": round(max_val + 50, 2),
    })
