# Project Plan: SCADA Data Analytics Dashboard with Machine Learning

## 1. Project Overview

**Title:** SCADA Data Analytics Dashboard with Machine Learning

**Type:** Minimum Viable Product (MVP) — a data science / analytics dashboard that simulates how a real SCADA (Supervisory Control and Data Acquisition) system's sensor data could be visualized, monitored, and analyzed using machine learning.

**Goal:** Build a working prototype that reads industrial sensor data (temperature, pressure, vibration, voltage, current), displays it on an interactive dashboard, raises alerts on abnormal readings, computes basic statistics, and predicts machine failure using a trained ML model.

**Why this project:** It builds directly on internship experience with PLC, SCADA, and HMI systems, and demonstrates practical data science skills (data handling, visualization, monitoring logic, predictive modeling) without overstating scope — it is explicitly framed as an MVP, not a full industrial SCADA product.

---

## 2. Objectives

- [x] Simulate SCADA sensor data using a structured CSV dataset
- [x] Build an interactive dashboard to display live/near-live sensor readings
- [x] Visualize sensor trends over time using charts
- [x] Implement rule-based alerts for abnormal readings
- [x] Perform basic statistical analysis on the data
- [x] Train and integrate a machine learning model to predict machine health/failure
- [x] Package the project cleanly with proper folder structure and documentation
- [x] Prepare a resume-ready description of the completed project


---

## 3. Problem Statement

In factories, machines continuously send sensor data to a SCADA system. Operators need answers to questions such as:

- Is everything running normally?
- Which machine consumes the most power?
- Which machine may fail soon?
- Are there any abnormal sensor readings?

Most basic SCADA displays only show raw numbers. This project goes a step further — it **analyzes** the data and provides **insights** and **predictions**, rather than just displaying values.

---

## 4. Scope (MVP Boundaries)

**In scope:**
- CSV-based simulated sensor data (acting as a stand-in for a live SCADA feed)
- A dashboard with live-style visualizations
- Simple rule-based alerting (threshold checks)
- Descriptive statistics (averages, max values, highest energy consumer)
- A basic supervised ML classifier for fault prediction

**Out of scope (explicitly NOT building):**
- A real-time industrial SCADA/PLC integration
- Actual hardware sensor connections
- A full-scale production monitoring system
- Complex deep learning models (not necessary for this MVP)

---

## 5. Features Breakdown

### Feature 1: Sensor Data Ingestion
- Create/use a CSV dataset with columns: `Time, Machine, Temperature, Pressure, Vibration, Voltage, Current`
- This CSV simulates the kind of data a SCADA system would normally stream in real time
- Load and clean this data using **Pandas**

### Feature 2: Dashboard
- Display current values for:
  - Temperature
  - Pressure
  - Vibration
  - Voltage
  - Current
- Add trend charts:
  - Temperature vs Time
  - Pressure vs Time
  - Vibration vs Time
- Built using **Streamlit** (frontend/UI) + **Plotly** (interactive charts)

### Feature 3: Alert System (Rule-Based)
- If `Temperature > 80°C` → show **"🔴 High Temperature Alert"**
- If `Vibration > threshold` → show **"⚠️ Machine Vibration High"**
- Keep the logic simple: basic if/else threshold checks (no complex logic needed for MVP)

### Feature 4: Data Analysis
Using Pandas, compute:
- Average Temperature
- Highest Temperature recorded
- Average Power Consumption
- Machine with the highest energy usage

### Feature 5: Machine Learning Module (Recommended, Optional Stretch Goal)
- **Input features:** Temperature, Pressure, Vibration, Voltage, Current
- **Output label:** Machine Healthy / Machine Fault
- **Algorithms to try:** Random Forest, Decision Tree, Logistic Regression
- **Output shown on dashboard:**
  - Machine ID
  - Probability of Failure (%)
  - Status (e.g., "⚠️ Maintenance Required")

---

## 6. System Architecture

```
Sensors
   │
   ▼
CSV Dataset
   │
   ▼
Python (Pandas)
   │
   ├────────► Dashboard
   │
   ├────────► Charts
   │
   ├────────► Alerts
   │
   └────────► ML Model
                   │
                   ▼
            Failure Prediction
```

**Flow explanation:**
1. Sensor data (simulated) is stored in a CSV file.
2. Python + Pandas reads and processes this data.
3. The processed data feeds four parallel outputs: the dashboard UI, the charts, the alert system, and the ML model.
4. The ML model further outputs a failure prediction, which is displayed back on the dashboard.

---

## 7. Tech Stack

| Layer | Tool/Library |
|---|---|
| Frontend/UI | Next.js (TypeScript, React, TailwindCSS, Shadcn, Recharts) |
| Backend | FastAPI (Python, Uvicorn) |
| Data Processing | Pandas, NumPy |
| Visualization | Recharts (React charts) |
| Machine Learning | Scikit-learn (Random Forest Classifier) |
| Dataset | CSV (7-day simulated sensor data) |

---

## 8. Folder Structure

```
SCADA_Project/
│
├── backend/
│   ├── app/
│   │   ├── controllers/
│   │   │   └── sensor_controller.py
│   │   ├── data/
│   │   │   └── sensor_data.csv
│   │   ├── models/
│   │   │   ├── schemas.py
│   │   │   └── model.pkl
│   │   ├── services/
│   │   │   └── data_service.py
│   │   └── main.py
│   ├── ml/
│   │   ├── generate_data.py
│   │   └── train_model.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── package.json
│   └── tsconfig.json
│
├── plan.md
└── README.md
```

**Purpose of key directories/files:**
- `backend/app/data/sensor_data.csv` — the simulated SCADA dataset
- `backend/app/models/model.pkl` — the saved/trained Random Forest ML model
- `backend/app/main.py` — FastAPI entrypoint
- `backend/ml/train_model.py` — script to train and export the ML model
- `backend/ml/generate_data.py` — script to generate the simulated sensor readings
- `frontend/app/page.tsx` — interactive Next.js dashboard UI


---

## 9. Development Plan / Timeline

A suggested step-by-step build order (can be adjusted based on available time):

### Phase 1: Setup & Data
- Set up project folder structure
- Create/generate the simulated sensor CSV dataset
- Set up Python environment and install backend dependencies (`pandas`, `numpy`, `fastapi`, `uvicorn`, `scikit-learn`)
- Set up Next.js frontend project and install dependencies (`recharts`, `lucide-react`, `tailwindcss`)

### Phase 2: Core Dashboard
- Build FastAPI routes for telemetry and analytics
- Build Next.js UI component pages
- Display current sensor readings in real-time cards
- Add Recharts trends for Temperature, Pressure, and Vibration vs Time

### Phase 3: Alerts & Analysis
- Add rule-based alert logic (temperature, vibration, voltage, current thresholds)
- Add statistical summary section (averages, max values, highest energy-consuming machine)
- Build detailed analytics page showing per-machine telemetry aggregates

### Phase 4: Machine Learning
- Prepare labeled training data (Healthy/Fault based on sensor patterns)
- Train models in `train_model.py` (Random Forest Classifier)
- Select the best-performing model and save it as `model.pkl`
- Integrate model predictions into the frontend ML Sandbox/Predictor (probability of failure, status, and recommendations)

### Phase 5: Polish & Documentation
- Clean up UI (sleek dark mode, neon badge indicators, responsive typography)
- Write root `README.md` with setup instructions, project architecture, and resume-ready descriptions
- Test the full flow end-to-end

---

## 10. Testing Checklist

- [x] CSV loads correctly without errors
- [x] Dashboard displays current values accurately
- [x] Charts update correctly when data changes
- [x] Alerts trigger correctly at threshold boundaries
- [x] Statistics (average/max/highest consumer) are computed correctly
- [x] ML model loads and predicts without runtime errors
- [x] Full app runs end-to-end with Next.js and FastAPI without crashing


---

## 12. Why This Is a Strong MVP

This project demonstrates multiple data science skills in a realistic industrial context:
- Data collection and preprocessing (CSV simulating SCADA data)
- Exploratory data analysis
- Interactive visualization
- Rule-based monitoring and alerting
- Predictive machine learning

It also aligns naturally with prior internship experience in PLC, SCADA, and HMI systems — creating a coherent, honest narrative on a resume without overstating what was actually built during the internship.