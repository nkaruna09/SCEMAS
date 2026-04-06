import argparse
import os
import random
import sys
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

FASTAPI_BASE = "http://localhost:8000"
SENSOR_API_KEY = os.getenv("SENSOR_API_KEY", "")
HEADERS = {"Content-Type": "application/json", "x-api-key": SENSOR_API_KEY}

SEED_ZONES = [
    {"name": "Downtown District"},
    {"name": "Waterfront Area"},
]

SEED_SENSORS = [
    {"name": "Temperature Sensor - Central Station", "metric_type": "temperature", "latitude": 43.2609, "longitude": -79.9192},
    {"name": "Humidity Sensor - Library",            "metric_type": "humidity",    "latitude": 43.2628, "longitude": -79.9175},
    {"name": "Air Quality Sensor - Park",            "metric_type": "air_quality", "latitude": 43.2650, "longitude": -79.9235},
    {"name": "Pressure Sensor - Harbor",             "metric_type": "pressure",    "latitude": 43.2571, "longitude": -79.9173},
    {"name": "Temperature Sensor - Hospital",        "metric_type": "temperature", "latitude": 43.2597, "longitude": -79.9158},
]

SEED_RULES = [
    {"metric_type": "temperature", "threshold_value": 35,  "operator": ">", "severity": "high"},
    {"metric_type": "humidity",    "threshold_value": 80,  "operator": ">", "severity": "medium"},
    {"metric_type": "air_quality", "threshold_value": 150, "operator": ">", "severity": "critical"},
    {"metric_type": "pressure",    "threshold_value": 950, "operator": "<", "severity": "low"},
]

# normal and alert value ranges per metric type
METRIC_RANGES: dict[str, dict] = {
    "temperature": {"unit": "°C",  "normal": (15.0, 34.0),    "alert": (36.0, 50.0)},
    "humidity":    {"unit": "%",   "normal": (30.0, 75.0),    "alert": (82.0, 99.0)},
    "air_quality": {"unit": "AQI", "normal": (20.0, 140.0),   "alert": (155.0, 250.0)},
    "pressure":    {"unit": "hPa", "normal": (960.0, 1050.0), "alert": (900.0, 948.0)},
}


def _fmt_time() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")

def _c(text: str, code: str) -> str:
    # wrap text in ANSI colour
    return f"\033[{code}m{text}\033[0m"


def ensure_seeded(supabase) -> list[dict]:
    # create zones, sensors, alert rules in DB if they're missing
    print("  Checking database …")

    # zones
    zone_resp = supabase.table("zones").select("id, name").execute()
    existing_zones = zone_resp.data or []
    if not existing_zones:
        print("  Creating zones …")
        zone_resp = supabase.table("zones").insert(SEED_ZONES).execute()
        existing_zones = zone_resp.data or []
    zone = existing_zones[0]
    print(_c(f"  Zone: {zone['name']}  ({zone['id'][:8]}…)", "32"))

    # sensors — only grab ones with a valid zone_id
    sensor_resp = (
        supabase.table("sensors")
        .select("id, name, zone_id, metric_type")
        .not_.is_("zone_id", "null")
        .execute()
    )
    usable = [s for s in (sensor_resp.data or []) if s.get("zone_id")]
    if not usable:
        print("  Creating sensors …")
        to_insert = [
            {**s, "zone_id": zone["id"], "status": "active", "approved": True}
            for s in SEED_SENSORS
        ]
        sensor_resp = supabase.table("sensors").insert(to_insert).execute()
        usable = sensor_resp.data or []

    print(_c(f"  Loaded {len(usable)} sensor(s)", "32"))
    for s in usable:
        print(f"    • {s['name']:<45} [{s['metric_type']}]")

    # alert rules
    rules_resp = supabase.table("alert_rules").select("id").execute()
    if not (rules_resp.data or []):
        print("  Creating alert rules …")
        supabase.table("alert_rules").insert(SEED_RULES).execute()
        print(_c("  Alert rules created", "32"))
    else:
        print(_c(f"  Alert rules: {len(rules_resp.data)} found", "32"))

    return usable


def generate_value(metric_type: str, force_alert: bool = False) -> float:
    info = METRIC_RANGES.get(metric_type, {})
    lo, hi = info.get("alert" if force_alert else "normal", (0.0, 100.0))
    return round(random.uniform(lo, hi), 2)


def send_reading(sensor: dict, value: float) -> bool | None:
    payload = {
        "sensor_id":      sensor["id"],
        "sensor_type":    "environmental",
        "telemetry_type": sensor["metric_type"],
        "raw_data_value": value,
        "city_location":  sensor["zone_id"],
    }
    try:
        resp = requests.post(f"{FASTAPI_BASE}/telemetry/ingest", json=payload, headers=HEADERS, timeout=5)
        if resp.status_code != 200:
            print(_c(f"    error {resp.status_code}: {resp.text}", "33"))
        return resp.status_code == 200
    except requests.exceptions.ConnectionError:
        return None  # FastAPI not running
    except Exception:
        return False


def check_fastapi() -> None:
    try:
        r = requests.get(f"{FASTAPI_BASE}/health", timeout=3)
        if r.status_code != 200:
            raise RuntimeError(f"status {r.status_code}")
        print(_c("  FastAPI backend is reachable", "32"))
    except Exception as exc:
        print(_c(f"  Cannot reach FastAPI at {FASTAPI_BASE}: {exc}", "31"))
        print(_c("  Start it first: python -m uvicorn main:app --reload --port 8000", "33"))
        sys.exit(1)


def run(interval: float, send_alerts: bool) -> None:
    print("\n" + "=" * 60)
    print(_c("  SCEMAS Sensor Simulator", "1"))
    print("=" * 60)

    check_fastapi()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    sensors = ensure_seeded(supabase)

    if not sensors:
        print(_c("  No sensors available — exiting", "31"))
        sys.exit(1)

    print(f"\n  Interval: {interval}s  |  Alert packets: {'every 5th' if send_alerts else 'off'}")
    print("  Press Ctrl+C to stop\n")
    print("-" * 60)

    packet_count = 0
    try:
        while True:
            sensor = random.choice(sensors)
            metric = sensor["metric_type"]
            unit = METRIC_RANGES.get(metric, {}).get("unit", "")

            # every 5th packet triggers an alert when --alert flag is set
            force_alert = send_alerts and (packet_count % 5 == 4)
            value = generate_value(metric, force_alert=force_alert)

            ts = _fmt_time()
            ok = send_reading(sensor, value)

            if ok is None:
                print(_c(f"[{ts}] FastAPI went offline — exiting", "31"))
                break

            packet_count += 1

            if force_alert:
                print(f"[{ts}] " + _c("ALERT  ", "31;1") + f"  {sensor['name']:<45}" + _c(f"  {metric:<15}", "35") + _c(f"  {value:>8.2f} {unit}", "31;1"))
            elif ok:
                print(f"[{ts}] " + _c("OK     ", "32")   + f"  {sensor['name']:<45}" + _c(f"  {metric:<15}", "36") + f"  {value:>8.2f} {unit}")
            else:
                print(f"[{ts}] " + _c("FAIL   ", "33")   + f"  {sensor['name']:<45}" + _c(f"  {metric:<15}", "36") + f"  {value:>8.2f} {unit}")

            time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n{'-' * 60}")
        print(f"  Stopped after {packet_count} packets.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SCEMAS mock sensor simulator")
    parser.add_argument("--interval", type=float, default=3.0, help="seconds between packets (default: 3)")
    parser.add_argument("--alert", action="store_true", help="trigger alert packets every 5th send")
    args = parser.parse_args()
    run(args.interval, args.alert)
