# Matches AlertRule class from class diagram
from dataclasses import dataclass


@dataclass
class AlertRule:
    sensor_id: str
    upper_limit: float
    lower_limit: float
