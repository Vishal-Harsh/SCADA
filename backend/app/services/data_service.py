import pandas as pd
import numpy as np
import os
import time
from typing import List, Dict, Any, Tuple
from app.models.schemas import SensorReading, DashboardStats, AlertLog

# Dynamically calculate path to the data folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "data", "sensor_data.csv")

class SCADADataService:
    def __init__(self, filepath: str = DATA_FILE):
        self.filepath = filepath
        self._df = None
        self._load_data()
        
    def _load_data(self):
        if os.path.exists(self.filepath):
            self._df = pd.read_csv(self.filepath)
            # Ensure proper typing
            self._df['Time'] = self._df['Time'].astype(str)
            self._df['Machine'] = self._df['Machine'].astype(str)
        else:
            self._df = None

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            self._load_data()
        return self._df

    def reload(self):
        self._load_data()

    def get_current_time_index(self) -> int:
        if self.df is None or len(self.df) == 0:
            return 0
        time_indices = self.df['Time'].unique()
        # Advance index every 5 seconds
        return int(time.time() / 5) % len(time_indices)

    def get_current_readings(self) -> List[Dict[str, Any]]:
        df = self.df
        if df is None or len(df) == 0:
            return []
        
        time_indices = df['Time'].unique()
        idx = self.get_current_time_index()
        target_time = time_indices[idx]
        
        current_df = df[df['Time'] == target_time]
        return current_df.to_dict(orient="records")

    def get_historical_readings(self, limit: int = 50) -> List[Dict[str, Any]]:
        df = self.df
        if df is None or len(df) == 0:
            return []
        
        time_indices = df['Time'].unique()
        idx = self.get_current_time_index()
        
        # Select the last N time indices up to the current index
        start_idx = max(0, idx - limit + 1)
        target_times = time_indices[start_idx:idx + 1]
        
        hist_df = df[df['Time'].isin(target_times)]
        return hist_df.to_dict(orient="records")

    def get_analytics(self) -> Dict[str, Any]:
        df = self.df
        if df is None or len(df) == 0:
            return {
                "avg_temp": 0.0,
                "max_temp": 0.0,
                "avg_vibration": 0.0,
                "avg_power_kw": 0.0,
                "max_power_machine": "N/A",
                "machine_averages": {}
            }
        
        # Work with data up to current time index to simulate "what is known so far"
        time_indices = df['Time'].unique()
        idx = self.get_current_time_index()
        known_times = time_indices[:idx + 1]
        sub_df = df[df['Time'].isin(known_times)].copy()
        
        # Calculate Power (kW) = Voltage * Current / 1000
        sub_df['Power_kW'] = (sub_df['Voltage'] * sub_df['Current']) / 1000.0
        
        # Compute global stats
        avg_temp = float(sub_df['Temperature'].mean())
        max_temp = float(sub_df['Temperature'].max())
        avg_vib = float(sub_df['Vibration'].mean())
        avg_power = float(sub_df['Power_kW'].mean())
        
        # Highest power consuming machine (cumulative/average energy consumption)
        machine_power = sub_df.groupby('Machine')['Power_kW'].mean()
        max_power_machine = str(machine_power.idxmax()) if not machine_power.empty else "N/A"
        
        # Compute stats per machine
        machine_stats = {}
        for mach in sub_df['Machine'].unique():
            mach_df = sub_df[sub_df['Machine'] == mach]
            machine_stats[mach] = {
                "avg_temp": float(mach_df['Temperature'].mean()),
                "max_temp": float(mach_df['Temperature'].max()),
                "avg_vibration": float(mach_df['Vibration'].mean()),
                "max_vibration": float(mach_df['Vibration'].max()),
                "avg_power_kw": float((mach_df['Voltage'] * mach_df['Current']).mean() / 1000.0)
            }
            
        return {
            "avg_temp": round(avg_temp, 2),
            "max_temp": round(max_temp, 2),
            "avg_vibration": round(avg_vib, 2),
            "avg_power_kw": round(avg_power, 2),
            "max_power_machine": max_power_machine,
            "machine_averages": machine_stats
        }

    def get_alerts(self) -> List[Dict[str, Any]]:
        df = self.df
        if df is None or len(df) == 0:
            return []
            
        # Get historical data up to current time
        time_indices = df['Time'].unique()
        idx = self.get_current_time_index()
        # Scan the last 30 intervals for alerts to keep the dashboard responsive
        start_idx = max(0, idx - 30)
        target_times = time_indices[start_idx:idx + 1]
        sub_df = df[df['Time'].isin(target_times)]
        
        alerts = []
        alert_id = 1
        
        # Rules:
        # 1. Temperature > 80.0 °C (Critical)
        # 2. Vibration > 5.0 mm/s (Warning) or > 8.0 mm/s (Critical)
        # 3. Voltage < 195.0 V or > 245.0 V (Warning)
        # 4. Current > 20.0 A (Critical)
        
        for _, row in sub_df.iterrows():
            # Check temp
            if row['Temperature'] > 80.0:
                alerts.append({
                    "id": alert_id,
                    "time": row['Time'],
                    "machine": row['Machine'],
                    "parameter": "Temperature",
                    "value": float(row['Temperature']),
                    "threshold": 80.0,
                    "severity": "CRITICAL",
                    "message": f"High Temperature Alert: {row['Temperature']}°C exceeds threshold of 80°C"
                })
                alert_id += 1
                
            # Check vibration
            if row['Vibration'] > 5.0:
                severity = "CRITICAL" if row['Vibration'] > 8.0 else "WARNING"
                alerts.append({
                    "id": alert_id,
                    "time": row['Time'],
                    "machine": row['Machine'],
                    "parameter": "Vibration",
                    "value": float(row['Vibration']),
                    "threshold": 5.0,
                    "severity": severity,
                    "message": f"High Vibration alert: {row['Vibration']}mm/s exceeds warning limit"
                })
                alert_id += 1
                
            # Check voltage
            if row['Voltage'] < 195.0 or row['Voltage'] > 245.0:
                val = float(row['Voltage'])
                msg = f"Low Voltage alert: {val}V below 195V" if val < 195.0 else f"High Voltage alert: {val}V above 245V"
                alerts.append({
                    "id": alert_id,
                    "time": row['Time'],
                    "machine": row['Machine'],
                    "parameter": "Voltage",
                    "value": val,
                    "threshold": 195.0 if val < 195.0 else 245.0,
                    "severity": "WARNING",
                    "message": msg
                })
                alert_id += 1
                
            # Check current
            if row['Current'] > 20.0:
                alerts.append({
                    "id": alert_id,
                    "time": row['Time'],
                    "machine": row['Machine'],
                    "parameter": "Current",
                    "value": float(row['Current']),
                    "threshold": 20.0,
                    "severity": "CRITICAL",
                    "message": f"Overcurrent detected: {row['Current']}A exceeds limit of 20A"
                })
                alert_id += 1
                
        # Return alerts ordered by time descending (latest first)
        alerts.reverse()
        return alerts
