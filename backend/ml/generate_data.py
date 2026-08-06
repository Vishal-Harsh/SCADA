import pandas as pd
import numpy as np
import datetime
import os

def generate_scada_data(num_days=7, filepath="backend/app/data/sensor_data.csv"):
    np.random.seed(42)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    machines = ["MC_01", "MC_02", "MC_03", "MC_04", "MC_05"]
    records = []
    
    # Let's generate data at 5-minute intervals
    start_time = datetime.datetime.now() - datetime.timedelta(days=num_days)
    total_intervals = num_days * 24 * 12  # 12 intervals per hour
    
    for i in range(total_intervals):
        current_time = start_time + datetime.timedelta(minutes=5 * i)
        time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
        
        for machine in machines:
            # Baseline features
            temp = np.random.normal(60, 5)        # normal temp around 60C
            press = np.random.normal(40, 4)       # normal pressure around 40 psi
            vib = np.random.normal(2.5, 0.5)      # normal vibration around 2.5 mm/s
            volt = np.random.normal(220, 5)       # normal voltage around 220V
            curr = np.random.normal(12, 1.5)      # normal current around 12A
            
            fault = 0
            
            # Introduce random anomaly behaviors (simulating faults)
            # 1. Overheating / high vibration (Mechanical fault)
            if np.random.random() < 0.02:  # 2% chance of a fault state
                temp += np.random.uniform(20, 35)   # temp spikes to 80-95C
                vib += np.random.uniform(3.5, 8.0)  # vibration spikes to 6-10 mm/s
                press += np.random.uniform(10, 25)  # pressure rises
                curr += np.random.uniform(5, 15)    # current rises
                fault = 1
                
            # 2. Electrical anomaly (voltage drop / overcurrent)
            elif np.random.random() < 0.01: # 1% chance
                volt -= np.random.uniform(30, 50)   # voltage drops below 190V
                curr += np.random.uniform(10, 20)   # overcurrent
                temp += np.random.uniform(10, 20)   # moderate heating
                fault = 1
                
            records.append({
                "Time": time_str,
                "Machine": machine,
                "Temperature": round(temp, 2),
                "Pressure": round(press, 2),
                "Vibration": round(vib, 2),
                "Voltage": round(volt, 2),
                "Current": round(curr, 2),
                "Fault": fault
            })
            
    df = pd.DataFrame(records)
    df.to_csv(filepath, index=False)
    print(f"Successfully generated {len(df)} records of simulated SCADA data at {filepath}")

if __name__ == "__main__":
    generate_scada_data()
