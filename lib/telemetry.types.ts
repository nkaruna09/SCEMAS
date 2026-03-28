// Mirrors the Python TelemetryReading dataclass — used to type API responses in the frontend
export interface TelemetryReading {
  sensor_id: string;
  telemetry_type: TelemetryType;
  value: number;
  city_location: string;
  timestamp: string;
  is_valid: boolean;
}

// Mirrors the Python AlertNotification dataclass
export interface AlertNotification {
  alert_id: string;
  sensor_id: string;
  telemetry_type: TelemetryType;
  measurement: number;
  threshold_value: number;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  acknowledged: boolean;
}

// Mirrors the Python AlertRule dataclass
export interface AlertRule {
  sensor_id: string;
  upper_limit: number;
  lower_limit: number;
}

// Mirrors the Python GraphData dataclass — image_b64 is the matplotlib PNG
export interface GraphData {
  metric_type: string;
  zone: string;
  data_points: number[];
  timestamps: string[];
  image_b64: string;
}

// Raw packet shape sent to the ingestion endpoint
export interface SensorPacket {
  sensor_id: string;
  sensor_type: SensorType;
  telemetry_type: TelemetryType;
  raw_data_value: number;
  city_location: string;
}

export type SensorType =
  | "air_quality"
  | "temperature"
  | "humidity"
  | "noise"
  | "water_quality"
  | "traffic";

export type TelemetryType =
  | "pm2_5"
  | "pm10"
  | "co2"
  | "temperature_c"
  | "humidity_pct"
  | "noise_db"
  | "ph"
  | "turbidity"
  | "vehicle_count";
