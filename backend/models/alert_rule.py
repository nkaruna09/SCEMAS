from dataclasses import dataclass


@dataclass
class AlertRule:
    # threshold rule for a specific metric type, loaded from the DB
    id: str
    metric_type: str  # which measurement type this rule applies to
    threshold_value: float
    operator: str  # '>', '<', '>=', '<=', '='
    severity: str  # 'low' | 'medium' | 'high' | 'critical'
