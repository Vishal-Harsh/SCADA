from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import List, Dict, Any
import os
import pickle
import numpy as np
import pandas as pd
from app.models import schemas
from app.services.data_service import SCADADataService

router = APIRouter()
data_service = SCADADataService()

# Global variable to cache the ML model
ML_MODEL = None
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "model.pkl")

def get_ml_model():
    global ML_MODEL
    if ML_MODEL is None:
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    ML_MODEL = pickle.load(f)
            except Exception as e:
                print(f"Error loading model: {e}")
        else:
            print(f"ML Model file not found at {MODEL_PATH}")
    return ML_MODEL

@router.get("/sensors/current", response_model=List[schemas.SensorReading])
def get_current_sensors():
    readings = data_service.get_current_readings()
    if not readings:
        raise HTTPException(status_code=404, detail="No sensor data found. Ensure CSV is generated.")
    return readings

@router.get("/sensors/history", response_model=List[schemas.SensorReading])
def get_sensor_history(limit: int = 50):
    readings = data_service.get_historical_readings(limit)
    if not readings:
        raise HTTPException(status_code=404, detail="No historical sensor data found.")
    return readings

@router.get("/analytics", response_model=schemas.DashboardStats)
def get_dashboard_analytics():
    return data_service.get_analytics()

@router.get("/alerts", response_model=List[schemas.AlertLog])
def get_active_alerts():
    return data_service.get_alerts()

@router.post("/predict", response_model=schemas.PredictResponse)
def predict_failure(request: schemas.PredictRequest):
    model = get_ml_model()
    if model is None:
        raise HTTPException(status_code=503, detail="ML Model not trained or loaded. Please train model first.")
        
    # Input data array for prediction
    features = np.array([[
        request.Temperature,
        request.Pressure,
        request.Vibration,
        request.Voltage,
        request.Current
    ]])
    
    try:
        # Get probability of class 1 (Fault)
        prob = model.predict_proba(features)[0][1]
        
        # Round failure probability to percent
        failure_prob_pct = round(float(prob) * 100, 2)
        
        # Determine status and recommendation
        if failure_prob_pct < 20.0:
            status = "Healthy"
            rec = "Machine is operating within normal parameters. Routine maintenance is scheduled."
        elif failure_prob_pct < 60.0:
            status = "Warning"
            rec = "Slight anomaly detected. Recommend visual inspection and monitoring of vibration levels."
        else:
            status = "Critical"
            rec = "CRITICAL: High risk of failure! Shut down the machine immediately and dispatch maintenance crew."
            
        return schemas.PredictResponse(
            failure_probability=failure_prob_pct,
            status=status,
            recommendation=rec
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
    
    dest_path = data_service.filepath
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    try:
        with open(dest_path, "wb") as f:
            content = await file.read()
            f.write(content)
        data_service.reload()
        return {"message": f"Successfully uploaded sensor CSV: {file.filename}. SCADA dataset updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")

@router.post("/reset")
def reset_data():
    # If the user wants to trigger regeneration
    try:
        from ml.generate_data import generate_scada_data
        generate_scada_data()
        data_service.reload()
        return {"message": "Simulated SCADA dataset reset to default successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
