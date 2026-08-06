"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Bell,
  BrainCircuit,
  Settings,
  Activity,
  Wifi,
  WifiOff,
  RotateCcw,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingDown,
  RefreshCw,
  Sliders
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

// Configuration
const BACKEND_URL = "http://127.0.0.1:8000";
const POLLING_INTERVAL_MS = 5000;

export default function SCADADashboard() {
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Data States
  const [currentReadings, setCurrentReadings] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMachine, setSelectedMachine] = useState<string>("MC_01");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeMachineCount, setActiveMachineCount] = useState<number>(0);

  // ML Sandbox Predictor States
  const [predictInputs, setPredictInputs] = useState({
    Temperature: 65.0,
    Pressure: 40.0,
    Vibration: 2.8,
    Voltage: 220.0,
    Current: 12.5
  });
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Settings & Upload States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Data Fetching Function
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Current Telemetry
      const currRes = await fetch(`${BACKEND_URL}/api/sensors/current`);
      if (!currRes.ok) throw new Error("Failed to fetch current readings");
      const currData = await currRes.json();
      setCurrentReadings(currData);
      
      // Update machine count
      const uniqueMachines = Array.from(new Set(currData.map((d: any) => d.Machine)));
      setActiveMachineCount(uniqueMachines.length);

      // 2. History for Charts
      const histRes = await fetch(`${BACKEND_URL}/api/sensors/history?limit=100`);
      if (!histRes.ok) throw new Error("Failed to fetch history");
      const histData = await histRes.json();
      setHistoricalData(histData);

      // 3. Analytics Descriptive Stats
      const analRes = await fetch(`${BACKEND_URL}/api/analytics`);
      if (!analRes.ok) throw new Error("Failed to fetch analytics");
      const analData = await analRes.json();
      setAnalytics(analData);

      // 4. Threshold Alert Logs
      const alertRes = await fetch(`${BACKEND_URL}/api/alerts`);
      if (!alertRes.ok) throw new Error("Failed to fetch alerts");
      const alertData = await alertRes.json();
      setAlerts(alertData);

      setIsBackendConnected(true);
    } catch (error) {
      console.error("Connection error:", error);
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Poll Backend at intervals
  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Run ML Prediction Sandbox
  const runPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    setPredictionResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictInputs)
      });
      if (!response.ok) {
        throw new Error(await response.text() || "Failed to predict machine health");
      }
      const result = await response.json();
      setPredictionResult(result);
    } catch (error: any) {
      alert(`ML Prediction Failed: ${error.message || error}`);
    } finally {
      setIsPredicting(false);
    }
  };

  // Upload Custom SCADA CSV
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadMessage("");
    
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setUploadMessage(data.message || "File uploaded successfully!");
        fetchData(); // reload
      } else {
        setUploadMessage(`Error: ${data.detail || "Upload failed"}`);
      }
    } catch (error) {
      setUploadMessage("Upload failed due to connection error.");
    } finally {
      setIsUploading(false);
    }
  };

  // Reset SCADA CSV to defaults
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/reset`, { method: "POST" });
      const data = await response.json();
      alert(data.message || "Simulated SCADA dataset reset successfully.");
      fetchData();
    } catch (error) {
      alert("Reset failed. Ensure backend server is running.");
    } finally {
      setIsResetting(false);
    }
  };

  // Filter historical data for selected machine in charts
  const getSelectedMachineHistory = () => {
    return historicalData.filter((r) => r.Machine === selectedMachine);
  };

  // Get active alerts specifically for the current virtual time index
  const getCurrentAlertsCount = () => {
    if (currentReadings.length === 0) return 0;
    // Check current telemetry rows for violations
    let count = 0;
    currentReadings.forEach((row) => {
      if (row.Temperature > 80.0) count++;
      if (row.Vibration > 5.0) count++;
      if (row.Voltage < 195.0 || row.Voltage > 245.0) count++;
      if (row.Current > 20.0) count++;
    });
    return count;
  };

  // Select severity colors
  const getSeverityBadge = (severity: string) => {
    if (severity === "CRITICAL") {
      return <Badge className="bg-red-500 hover:bg-red-600 animate-pulse text-white font-semibold">CRITICAL</Badge>;
    }
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">WARNING</Badge>;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 font-sans min-h-screen">
      
      {/* Top Header / Nav Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/25">
            <Activity className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SCADA Analytics AI
            </h1>
            <p className="text-xs text-slate-400 font-medium">Predictive Monitoring Dashboard</p>
          </div>
        </div>

        {/* Dynamic Navigation Bar (aligned with plan.md endpoints) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "dashboard"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab("trends")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "trends"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Sensor Trends
          </button>
          
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "analytics"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Data Analytics
          </button>
          
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
              activeTab === "alerts"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Bell className="h-4 w-4" />
            Alerts Log
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("predictor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "predictor"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            ML Predictor
          </button>
          
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "settings"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Settings className="h-4 w-4" />
            Ingest / Data
          </button>
        </nav>

        {/* Network & Loading Status indicators */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Force refresh telemetry data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {isBackendConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex gap-1.5 items-center py-1.5 px-3 rounded-full font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Connected
            </Badge>
          ) : (
            <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex gap-1.5 items-center py-1.5 px-3 rounded-full font-semibold">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Offline Warning Banner */}
        {!isBackendConnected && (
          <Alert variant="destructive" className="mb-6 border-red-900/50 bg-red-950/20 text-red-300">
            <WifiOff className="h-4 w-4" />
            <AlertTitle className="font-bold text-red-400">FastAPI Server Offline</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              Unable to connect to the backend API at <code className="bg-red-950/60 px-1.5 py-0.5 rounded font-mono">{BACKEND_URL}</code>.
              Please start the python server by running: 
              <span className="block font-mono bg-red-950/50 border border-red-900/30 p-2 mt-2 rounded select-all">
                backend/.venv/Scripts/python -m uvicorn app.main:app --reload
              </span>
              Once the backend is online, this dashboard will automatically reconnect and resume polling.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && isBackendConnected ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-10 w-10 text-violet-500 animate-spin" />
            <p className="text-slate-400 text-sm font-semibold">Initializing SCADA telemetry streaming...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. DASHBOARD VIEW */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* System Overview KPI Panel */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-900/40 border-slate-900 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs text-slate-400 font-bold uppercase">System Status</CardDescription>
                      <CardTitle className="text-xl font-bold flex items-center justify-between">
                        Operational
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">OK</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400">All SCADA pipelines report active communication links.</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900/40 border-slate-900 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs text-slate-400 font-bold uppercase">Active Machines</CardDescription>
                      <CardTitle className="text-3xl font-extrabold text-violet-400">{activeMachineCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400">Monitoring MC_01 through MC_05 SCADA sensors.</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900/40 border-slate-900 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs text-slate-400 font-bold uppercase">Active Anomalies</CardDescription>
                      <CardTitle className="text-3xl font-extrabold text-amber-500">{getCurrentAlertsCount()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400">Threshold alarms triggered in the current sensor cycle.</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900/40 border-slate-900 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs text-slate-400 font-bold uppercase">Streaming Tick Rate</CardDescription>
                      <CardTitle className="text-3xl font-extrabold text-indigo-400">5.0s</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400">Synchronized telemetry ingestion index interval.</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Live Telemetry Grid */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">Live SCADA Feeds</h2>
                      <p className="text-xs text-slate-400">Telemetry readouts for simulated SCADA machines</p>
                    </div>
                    {currentReadings.length > 0 && (
                      <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-850">
                        Virtual Clock: {currentReadings[0]?.Time}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {currentReadings.map((reading) => {
                      const isFaulty = reading.Fault === 1 || reading.Temperature > 80.0 || reading.Vibration > 5.0;
                      return (
                        <Card 
                          key={reading.Machine} 
                          className={`bg-slate-900/50 shadow-md border transition-all duration-300 ${
                            isFaulty 
                              ? "border-red-900/50 bg-red-950/10 shadow-red-950/20" 
                              : "border-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-200">{reading.Machine}</CardTitle>
                            {isFaulty ? (
                              <Badge variant="destructive" className="animate-pulse bg-red-500 text-white font-bold text-[10px]">
                                ALARM
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                NORMAL
                              </Badge>
                            )}
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <div className="flex justify-between items-baseline border-b border-slate-900 pb-1.5">
                              <span className="text-[11px] text-slate-400">Temperature</span>
                              <span className={`text-sm font-bold font-mono ${reading.Temperature > 80.0 ? "text-red-400" : "text-white"}`}>
                                {reading.Temperature}°C
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-baseline border-b border-slate-900 pb-1.5">
                              <span className="text-[11px] text-slate-400">Vibration</span>
                              <span className={`text-sm font-bold font-mono ${reading.Vibration > 5.0 ? "text-amber-400" : "text-white"}`}>
                                {reading.Vibration} mm/s
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-baseline border-b border-slate-900 pb-1.5">
                              <span className="text-[11px] text-slate-400">Pressure</span>
                              <span className="text-sm font-bold font-mono text-white">{reading.Pressure} PSI</span>
                            </div>
                            
                            <div className="flex justify-between items-baseline border-b border-slate-900 pb-1.5">
                              <span className="text-[11px] text-slate-400">Voltage</span>
                              <span className={`text-sm font-bold font-mono ${reading.Voltage < 195.0 || reading.Voltage > 245.0 ? "text-amber-400" : "text-white"}`}>
                                {reading.Voltage}V
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-baseline">
                              <span className="text-[11px] text-slate-400">Current</span>
                              <span className={`text-sm font-bold font-mono ${reading.Current > 20.0 ? "text-red-400" : "text-white"}`}>
                                {reading.Current}A
                              </span>
                            </div>

                            {/* Power Quick Calculation */}
                            <div className="pt-2 border-t border-dashed border-slate-800 flex justify-between items-baseline">
                              <span className="text-[10px] text-indigo-400 font-semibold uppercase">Power Cons.</span>
                              <span className="text-xs font-extrabold font-mono text-indigo-400">
                                {roundDecimal((reading.Voltage * reading.Current) / 1000)} kW
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-panels: Quick Chart & Quick Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Quick Telemetry chart */}
                  <Card className="lg:col-span-2 bg-slate-900/30 border-slate-900 shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-md font-bold text-white">Live Monitoring Trend</CardTitle>
                        <CardDescription className="text-xs text-slate-400">Temperature levels for {selectedMachine}</CardDescription>
                      </div>
                      <select
                        value={selectedMachine}
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        className="bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                      >
                        {["MC_01", "MC_02", "MC_03", "MC_04", "MC_05"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </CardHeader>
                    <CardContent className="h-64">
                      {historicalData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getSelectedMachineHistory().slice(-20)}>
                            <defs>
                              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis 
                              dataKey="Time" 
                              tickFormatter={(tick) => tick.split(" ")[1] || tick} 
                              stroke="#64748b" 
                              fontSize={10} 
                            />
                            <YAxis domain={[40, 110]} stroke="#64748b" fontSize={10} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#f8fafc" }} 
                              labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                            />
                            <Area type="monotone" dataKey="Temperature" name="Temperature (°C)" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">No historical runs buffered</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Immediate alerts log sidebar */}
                  <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-bold text-white flex items-center justify-between">
                        Recent Alarms
                        <Badge className="bg-slate-800 text-slate-300 font-bold border border-slate-700">{alerts.slice(0, 15).length} active</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">Rule-based threshold violations</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-64 overflow-y-auto space-y-3">
                      {alerts.length > 0 ? (
                        alerts.slice(0, 5).map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-3 rounded border text-xs leading-relaxed transition-all duration-200 ${
                              alert.severity === "CRITICAL"
                                ? "bg-red-950/10 border-red-900/30 text-red-300"
                                : "bg-amber-950/10 border-amber-900/30 text-amber-300"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1 font-semibold">
                              <span className="font-bold">{alert.machine} • {alert.parameter}</span>
                              <span className="text-[10px] text-slate-500">{alert.time.split(" ")[1]}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{alert.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-2" />
                          All machine sensors within safe ranges
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* 2. SENSOR TRENDS VIEW */}
            {activeTab === "trends" && (
              <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                <CardHeader className="pb-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-white">SCADA Historical Trends</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Time-series telemetry for parameter calibration checks
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-semibold">Select Target Node:</span>
                    <select
                      value={selectedMachine}
                      onChange={(e) => setSelectedMachine(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-slate-350 text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                    >
                      {["MC_01", "MC_02", "MC_03", "MC_04", "MC_05"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  {/* Temperature vs Pressure graph */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-200 px-1">Temperature Ingress Curve (°C)</h3>
                      <div className="h-64 bg-slate-950/20 border border-slate-900/60 p-2 rounded-xl">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getSelectedMachineHistory()}>
                            <defs>
                              <linearGradient id="colorTempLg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="Time" stroke="#64748b" fontSize={9} tickFormatter={(t) => t.split(" ")[1]} />
                            <YAxis domain={["dataMin - 10", "dataMax + 10"]} stroke="#64748b" fontSize={9} />
                            <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#f8fafc" }} />
                            <Area type="monotone" dataKey="Temperature" name="Temp" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTempLg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-200 px-1">Pressure Variance (PSI)</h3>
                      <div className="h-64 bg-slate-950/20 border border-slate-900/60 p-2 rounded-xl">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getSelectedMachineHistory()}>
                            <defs>
                              <linearGradient id="colorPressLg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="Time" stroke="#64748b" fontSize={9} tickFormatter={(t) => t.split(" ")[1]} />
                            <YAxis domain={["dataMin - 5", "dataMax + 5"]} stroke="#64748b" fontSize={9} />
                            <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#f8fafc" }} />
                            <Area type="monotone" dataKey="Pressure" name="Pressure" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPressLg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Vibration graph */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200 px-1">Structural Vibration Telemetry (mm/s)</h3>
                    <div className="h-64 bg-slate-950/20 border border-slate-900/60 p-2 rounded-xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getSelectedMachineHistory()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="Time" stroke="#64748b" fontSize={9} tickFormatter={(t) => t.split(" ")[1]} />
                          <YAxis domain={[0, "dataMax + 2"]} stroke="#64748b" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#f8fafc" }} />
                          <Legend />
                          <Line type="monotone" dataKey="Vibration" name="Vibration (mm/s)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 3. DATA ANALYTICS VIEW */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                
                {/* Descriptive Stats Cards */}
                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900/40 border-slate-900 shadow-md">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs text-slate-400 font-bold uppercase">System Avg Temperature</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-100">{analytics.avg_temp}°C</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[11px] text-slate-400">Total mathematical average across all sensor intervals</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-slate-900 shadow-md">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs text-slate-400 font-bold uppercase">Peak Temp Recorded</CardDescription>
                        <CardTitle className="text-2xl font-black text-rose-450">{analytics.max_temp}°C</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[11px] text-slate-400">Highest individual reading processed from raw data logs</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-slate-900 shadow-md">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs text-slate-400 font-bold uppercase">Avg System Power (kW)</CardDescription>
                        <CardTitle className="text-2xl font-black text-indigo-400">{analytics.avg_power_kw} kW</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[11px] text-slate-400">Calculated sum average using active Voltage & Current</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-slate-900 shadow-md">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs text-slate-400 font-bold uppercase">Highest Consumer</CardDescription>
                        <CardTitle className="text-2xl font-black text-violet-400">{analytics.max_power_machine}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[11px] text-slate-400">Machine leading cumulative virtual electric consumption</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Analytical breakdown table */}
                <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-white">Aggregated Machine Metrics</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Detailed parameters averages compiled from SCADA records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table className="border border-slate-900 text-xs">
                      <TableHeader className="bg-slate-950/60">
                        <TableRow className="border-b border-slate-900">
                          <TableHead className="font-semibold text-slate-300">Machine ID</TableHead>
                          <TableHead className="font-semibold text-slate-300">Avg Temperature (°C)</TableHead>
                          <TableHead className="font-semibold text-slate-300">Max Temperature (°C)</TableHead>
                          <TableHead className="font-semibold text-slate-300">Avg Vibration (mm/s)</TableHead>
                          <TableHead className="font-semibold text-slate-300">Max Vibration (mm/s)</TableHead>
                          <TableHead className="font-semibold text-slate-300">Avg Electrical Load (kW)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics && Object.keys(analytics.machine_averages).map((mach) => {
                          const stats = analytics.machine_averages[mach];
                          return (
                            <TableRow key={mach} className="border-b border-slate-900 hover:bg-slate-900/20">
                              <TableCell className="font-bold text-slate-200">{mach}</TableCell>
                              <TableCell className="font-mono text-slate-300">{stats.avg_temp.toFixed(2)}°C</TableCell>
                              <TableCell className="font-mono text-slate-300">{stats.max_temp.toFixed(2)}°C</TableCell>
                              <TableCell className="font-mono text-slate-300">{stats.avg_vibration.toFixed(2)}</TableCell>
                              <TableCell className="font-mono text-slate-300">{stats.max_vibration.toFixed(2)}</TableCell>
                              <TableCell className="font-mono text-indigo-400 font-semibold">{stats.avg_power_kw.toFixed(3)} kW</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Energy usage comparison chart */}
                {analytics && (
                  <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-md font-bold text-white">Power Consumption by Machine Unit</CardTitle>
                      <CardDescription className="text-xs text-slate-400">Comparing mean loading coefficients (kW)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.keys(analytics.machine_averages).map((mach) => ({
                          name: mach,
                          power: analytics.machine_averages[mach].avg_power_kw
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", color: "#f8fafc" }} />
                          <Bar dataKey="power" name="Avg Power (kW)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* 4. ALERTS LOG VIEW */}
            {activeTab === "alerts" && (
              <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                <CardHeader className="border-b border-slate-900 pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">SCADA Active Alarm Buffer</CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Rule-based notification logging for critical safety thresholds
                      </CardDescription>
                    </div>
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-bold py-1 px-3">
                      SYSTEM ACTIVE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {alerts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table className="border border-slate-900 text-xs">
                        <TableHeader className="bg-slate-950/60">
                          <TableRow className="border-b border-slate-900">
                            <TableHead className="font-semibold text-slate-350">Alert ID</TableHead>
                            <TableHead className="font-semibold text-slate-350">Timestamp</TableHead>
                            <TableHead className="font-semibold text-slate-350">Machine</TableHead>
                            <TableHead className="font-semibold text-slate-350">Parameter</TableHead>
                            <TableHead className="font-semibold text-slate-350">Recorded Value</TableHead>
                            <TableHead className="font-semibold text-slate-350">Safety Limit</TableHead>
                            <TableHead className="font-semibold text-slate-350">Severity</TableHead>
                            <TableHead className="font-semibold text-slate-350">Description Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alerts.map((alert) => (
                            <TableRow key={alert.id} className="border-b border-slate-900 hover:bg-slate-900/10">
                              <TableCell className="font-mono text-slate-400">#AL-{alert.id}</TableCell>
                              <TableCell className="font-mono text-slate-300">{alert.time}</TableCell>
                              <TableCell className="font-bold text-slate-200">{alert.machine}</TableCell>
                              <TableCell className="font-semibold text-violet-400">{alert.parameter}</TableCell>
                              <TableCell className="font-bold font-mono text-rose-400">{alert.value}</TableCell>
                              <TableCell className="font-mono text-slate-400">{alert.threshold}</TableCell>
                              <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                              <TableCell className="text-slate-350 max-w-sm overflow-hidden text-ellipsis whitespace-nowrap" title={alert.message}>
                                {alert.message}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 text-sm">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                      <p className="font-semibold">Healthy state. No alarms registered in the current buffer segment.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 5. ML PREDICTOR VIEW */}
            {activeTab === "predictor" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Input form */}
                <Card className="lg:col-span-1 bg-slate-900/30 border-slate-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-white flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-violet-500" />
                      Telemetry Input Sandbox
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Configure custom sensor metrics to trigger ML fault evaluation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={runPrediction} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={predictInputs.Temperature}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Temperature: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Vibration Amplitude (mm/s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={predictInputs.Vibration}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Vibration: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Pressure (PSI)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={predictInputs.Pressure}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Pressure: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Voltage (V)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={predictInputs.Voltage}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Voltage: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">Current (A)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={predictInputs.Current}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Current: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isPredicting || !isBackendConnected}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white font-bold py-2.5 px-4 rounded transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
                      >
                        <Play className="h-3 w-3" />
                        {isPredicting ? "Running Classifier..." : "Execute Diagnostic Predictor"}
                      </button>
                    </form>
                  </CardContent>
                </Card>

                {/* Diagnostic Results */}
                <Card className="lg:col-span-2 bg-slate-900/30 border-slate-900 shadow-md flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-white flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-violet-500" />
                      ML Diagnostic Report
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Predictive Classifier Failure Probability Assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center items-center py-6">
                    {predictionResult ? (
                      <div className="w-full max-w-md space-y-6 text-center">
                        <div className="relative flex items-center justify-center">
                          {/* Probability Glow Circle */}
                          <div className={`h-40 w-40 rounded-full flex flex-col items-center justify-center border-4 shadow-xl ${
                            predictionResult.status === "Healthy" 
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                              : predictionResult.status === "Warning"
                              ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                              : "border-red-500/30 bg-red-500/5 text-red-400"
                          }`}>
                            <span className="text-3xl font-black font-mono">
                              {predictionResult.failure_probability}%
                            </span>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">
                              Risk Score
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-black flex items-center justify-center gap-2">
                            State: 
                            <span className={
                              predictionResult.status === "Healthy"
                                ? "text-emerald-400"
                                : predictionResult.status === "Warning"
                                ? "text-amber-400"
                                : "text-red-400"
                            }>
                              {predictionResult.status.toUpperCase()}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-350 bg-slate-950 p-4 rounded-xl border border-slate-900 leading-relaxed">
                            {predictionResult.recommendation}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-center space-y-3 py-10 max-w-sm">
                        <BrainCircuit className="h-12 w-12 text-slate-700" />
                        <h3 className="text-sm font-bold text-slate-455">Awaiting Diagnostics</h3>
                        <p className="text-xs text-slate-400">
                          Submit custom telemetry coefficients using the sandbox control to generate a diagnostic ML health prediction.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 6. SETTINGS VIEW */}
            {activeTab === "settings" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CSV Ingestion form */}
                <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-white flex items-center gap-2">
                      <Upload className="h-4 w-4 text-violet-500" />
                      SCADA Ingest Management
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Upload custom CSV telemetry tables to load alternative simulated SCADA streams.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleFileUpload} className="space-y-4">
                      <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-violet-500/50 transition-colors flex flex-col items-center justify-center gap-2 bg-slate-950/20">
                        <Upload className="h-8 w-8 text-slate-600 mb-1" />
                        <label className="text-xs font-semibold cursor-pointer text-violet-400 hover:underline">
                          Select telemetry file (.csv)
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        {uploadFile && (
                          <span className="text-xs text-emerald-400 font-mono mt-2 block font-bold">
                            Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block">
                          Columns required: Time, Machine, Temperature, Pressure, Vibration, Voltage, Current, Fault
                        </span>
                      </div>

                      {uploadMessage && (
                        <div className={`p-3 rounded-lg text-xs leading-normal font-mono border ${
                          uploadMessage.includes("Error")
                            ? "bg-red-950/10 border-red-900/30 text-red-400"
                            : "bg-emerald-950/10 border-emerald-900/30 text-emerald-450"
                        }`}>
                          {uploadMessage}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isUploading || !uploadFile || !isBackendConnected}
                        className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 px-4 rounded text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isUploading ? "Uploading..." : "Import SCADA Table"}
                      </button>
                    </form>
                  </CardContent>
                </Card>

                {/* Reset Data card */}
                <Card className="bg-slate-900/30 border-slate-900 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-white flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-violet-500" />
                      Reset Dataset Default Pipeline
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Regenerate simulated industrial SCADA CSV logs with normal/fault sensor distributions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Resets the backend datastore path and triggers the mock telemetry generator.
                      This generates fresh sensor metrics (Temperature, Vibration, Pressure, Voltage, Current) across 7 historical days for units MC_01 to MC_05, incorporating random fault states.
                    </p>
                    
                    <button
                      onClick={handleResetData}
                      disabled={isResetting || !isBackendConnected}
                      className="w-full bg-red-900/10 hover:bg-red-900/20 text-red-400 border border-red-900/20 font-bold py-2.5 px-4 rounded text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {isResetting ? "Rebuilding Dataset..." : "Reset simulated CSV logs"}
                    </button>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950 mt-auto">
        <p>© 2026 SCADA Data Analytics ML MVP • Crafted using Next.js & FastAPI Architecture</p>
      </footer>
    </div>
  );
}

// Inline helper to round decimal numbers safely
function roundDecimal(val: any): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}
