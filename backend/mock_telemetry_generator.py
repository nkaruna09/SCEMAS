import random
import uuid
from datetime import datetime, timezone

# sensor type list teleme type mix and max values
SENSOR_CATALOGUE: dict[str, list[tuple[str, float, float]]] = {
    "air_quality": [
        ("pm2_5",       0.0,  150.0),
        ("pm10",        0.0,  250.0),
        ("co2_ppm",   350.0, 2000.0),
        ("no2_ppb",     0.0,  200.0),
    ],
    "weather": [
        ("temperature_c",  -30.0,  45.0),
        ("humidity_pct",     0.0, 100.0),
        ("pressure_hpa",   950.0, 1050.0),
        ("wind_speed_ms",    0.0,  40.0),
    ],
    "noise": [
        ("noise_db", 20.0, 120.0),
    ],
}

CITY_ZONES = [
    "zone_downtown", "zone_north", "zone_south",
    "zone_east", "zone_west", "zone_industrial",
]


def generate_mock_packet(overrides: dict | None = None) -> dict:
    # generate random packet
    sensor_type = random.choice(list(SENSOR_CATALOGUE.keys()))
    telemetry_type, min_val, max_val = random.choice(SENSOR_CATALOGUE[sensor_type])

    packet: dict = {
        "sensor_id":      str(uuid.uuid4()),
        "sensor_type":    sensor_type,
        "telemetry_type": telemetry_type,
        "raw_data_value": round(random.uniform(min_val, max_val), 3),
        "city_location":  random.choice(CITY_ZONES),
        "timestamp":      datetime.now(timezone.utc).isoformat(),
    }

    if overrides:
        packet.update(overrides)

    return packet


def generate_mock_batch(count: int = 10) -> list[dict]:
    # generate count random packets
    return [generate_mock_packet() for _ in range(count)]

def generate_alert_packet(sensor_type: str | None = None, telemetry_type: str | None = None) -> dict:
    # guaranterrd to exceed threshold
    if sensor_type is None:
        sensor_type = random.choice(list(SENSOR_CATALOGUE.keys()))

    if telemetry_type is None:
        telemetry_type, _, max_val = random.choice(SENSOR_CATALOGUE[sensor_type])
    else:
        metrics = {m[0]: m for m in SENSOR_CATALOGUE.get(sensor_type, [])}
        _, _, max_val = metrics.get(telemetry_type, (None, None, 100.0))

    return generate_mock_packet(overrides={
        "sensor_type":    sensor_type,
        "telemetry_type": telemetry_type,
        "raw_data_value": round(max_val + 50, 3),
    })
