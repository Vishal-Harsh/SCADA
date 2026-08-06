from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import sensor_controller
import os

app = FastAPI(
    title="SCADA Data Analytics Dashboard API",
    description="Backend API for simulating SCADA feeds, running analytics, and generating ML failure predictions.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(sensor_controller.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "description": "SCADA Data Analytics Backend API",
        "endpoints": {
            "docs": "/docs",
            "current_telemetry": "/api/sensors/current",
            "historical_telemetry": "/api/sensors/history",
            "dashboard_analytics": "/api/analytics",
            "alerts": "/api/alerts",
            "ml_prediction": "/api/predict"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
