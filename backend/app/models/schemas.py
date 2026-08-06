from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SensorReading(BaseModel):
    Time: str
    Machine: str
    Temperature: float
    Pressure: float
    Vibration: float
    Voltage: float
    Current: float
    Fault: int

class DashboardStats(BaseModel):
    avg_temp: float
    max_temp: float
    avg_vibration: float
    avg_power_kw: float
    max_power_machine: str
    machine_averages: Dict[str, Dict[str, float]]

class AlertLog(BaseModel):
    id: int
    time: str
    machine: str
    parameter: str
    value: float
    threshold: float
    severity: str  # "WARNING", "CRITICAL"
    message: str

class PredictRequest(BaseModel):
    Temperature: float
    Pressure: float
    Vibration: float
    Voltage: float
    Current: float

class PredictResponse(BaseModel):
    failure_probability: float
    status: str  # "Healthy", "Warning", "Critical"
    recommendation: str
