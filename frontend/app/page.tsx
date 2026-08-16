"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  BrainCircuit,
  Activity,
  WifiOff,
  RotateCcw,
  Play,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Moon,
  Sun,
  AlertTriangle,
  Clock,
  Cpu,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

// Reusable Minimalistic Custom Horizontal Spark Gauge component
function TelemetryCard({
  value,
  min,
  max,
  unit,
  label,
  warnThreshold,
  critThreshold
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  warnThreshold?: number | ((v: number) => boolean);
  critThreshold?: number | ((v: number) => boolean);
}) {
  const isCritical = typeof critThreshold === "function" ? critThreshold(value) : (critThreshold !== undefined && value >= critThreshold);
  const isWarning = typeof warnThreshold === "function" ? warnThreshold(value) : (warnThreshold !== undefined && value >= warnThreshold);

  let statusColor = "bg-primary";
  let statusTextColor = "text-primary font-bold";
  let cardBg = "bg-card";
  let cardBorder = "border-border/60";

  if (isCritical) {
    statusColor = "bg-red-500";
    statusTextColor = "text-red-600 dark:text-red-400 font-extrabold";
    cardBg = "bg-red-500/5";
    cardBorder = "border-red-500/15";
  } else if (isWarning) {
    statusColor = "bg-amber-500";
    statusTextColor = "text-amber-600 dark:text-amber-450 font-bold";
    cardBg = "bg-amber-500/5";
    cardBorder = "border-amber-500/15";
  }

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`p-4 rounded-xl border ${cardBorder} ${cardBg} flex flex-col justify-between h-28 transition-all duration-300`}>
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className={`text-[9px] uppercase tracking-wider ${statusTextColor}`}>
          {isCritical ? "CRITICAL" : isWarning ? "WARNING" : "NORMAL"}
        </span>
      </div>
      <div className="flex items-baseline gap-1 my-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{value.toFixed(1)}</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{unit}</span>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div className={`h-full ${statusColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground/60 font-mono font-semibold">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

export default function SCADADashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light"); // Default to clean light mode
  
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
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  // ML Predictor States
  const [predictInputs, setPredictInputs] = useState({
    Temperature: 65.0,
    Pressure: 40.0,
    Vibration: 2.8,
    Voltage: 220.0,
    Current: 12.5
  });
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Data Fetching
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const currRes = await fetch(`${BACKEND_URL}/api/sensors/current`);
      if (!currRes.ok) throw new Error("Failed to fetch current readings");
      const currData = await currRes.json();
      setCurrentReadings(currData);
      
      const uniqueMachines = Array.from(new Set(currData.map((d: any) => d.Machine)));
      setActiveMachineCount(uniqueMachines.length);

      const histRes = await fetch(`${BACKEND_URL}/api/sensors/history?limit=100`);
      if (!histRes.ok) throw new Error("Failed to fetch history");
      const histData = await histRes.json();
      setHistoricalData(histData);

      const analRes = await fetch(`${BACKEND_URL}/api/analytics`);
      if (!analRes.ok) throw new Error("Failed to fetch analytics");
      const analData = await analRes.json();
      setAnalytics(analData);

      const alertRes = await fetch(`${BACKEND_URL}/api/alerts`);
      if (!alertRes.ok) throw new Error("Failed to fetch alerts");
      const alertData = await alertRes.json();
      setAlerts(alertData);

      setIsBackendConnected(true);
      setSecondsSinceUpdate(0);
    } catch (error) {
      console.error("Connection error:", error);
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Run ML Prediction
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

  // Reset SCADA CSV dataset
  const handleResetData = async () => {
    const confirmReset = window.confirm("Are you sure you want to regenerate and reset the simulated SCADA telemetry dataset?");
    if (!confirmReset) return;
    
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const getSelectedMachineHistory = () => {
    return historicalData.filter((r) => r.Machine === selectedMachine);
  };

  const getActiveMachineReading = () => {
    return currentReadings.find((r) => r.Machine === selectedMachine) || {
      Temperature: 0,
      Pressure: 0,
      Vibration: 0,
      Voltage: 0,
      Current: 0,
      Fault: 0
    };
  };

  const getSelectedMachineStats = () => {
    const history = getSelectedMachineHistory();
    if (history.length === 0) {
      return {
        temp: { avg: 0, max: 0, min: 0 },
        press: { avg: 0, max: 0, min: 0 },
        vib: { avg: 0, max: 0, min: 0 }
      };
    }
    const temps = history.map((h) => h.Temperature);
    const press = history.map((h) => h.Pressure);
    const vibs = history.map((h) => h.Vibration);

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      temp: {
        avg: avg(temps),
        max: Math.max(...temps),
        min: Math.min(...temps)
      },
      press: {
        avg: avg(press),
        max: Math.max(...press),
        min: Math.min(...press)
      },
      vib: {
        avg: avg(vibs),
        max: Math.max(...vibs),
        min: Math.min(...vibs)
      }
    };
  };

  const safeLimits = {
    Temperature: 80.0,
    Vibration: 5.0,
    Pressure: 50.0,
    Voltage: 240.0,
    Current: 20.0
  };

  const activeMachineData = getActiveMachineReading();
  const machineStats = getSelectedMachineStats();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
        
        {/* Sleek Top Navigation Header */}
        <header className="w-full bg-card border-b border-border/60 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/10">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                <span>SCADA Pipeline</span>
                <span>/</span>
                <span className="text-foreground">{selectedMachine}</span>
              </div>
              <h1 className="text-sm font-bold tracking-tight text-foreground mt-0.5">
                Core Instrumentation Pipeline
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-md border border-border">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>PLC Sync: <strong className="text-foreground font-mono">{secondsSinceUpdate}s ago</strong></span>
            </div>

            {isBackendConnected ? (
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded text-[9px] shadow-none flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                SERVER ONLINE
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-655 dark:text-red-400 border border-red-500/20 font-bold px-2 py-0.5 rounded text-[9px] shadow-none flex items-center gap-1">
                <WifiOff className="h-2.5 w-2.5" />
                SERVER OFFLINE
              </Badge>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetData}
                disabled={isResetting || !isBackendConnected}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-card hover:bg-secondary disabled:opacity-50 text-foreground transition-all text-[11px] font-bold cursor-pointer"
              >
                <RotateCcw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
                Reset Data
              </button>

              <button
                onClick={toggleTheme}
                className="p-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={theme === "dark" ? "Light Theme" : "Dark Theme"}
              >
                {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs & Node Selector Bar */}
        <div className="w-full bg-card border-b border-border/50 px-6 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-6">
            {[
              { id: "dashboard", label: "Dashboard & Alarms", icon: LayoutDashboard },
              { id: "trends", label: "History & Analytics", icon: TrendingUp },
              { id: "predictor", label: "ML Diagnosis", icon: BrainCircuit }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3.5 text-xs font-bold uppercase tracking-widest relative transition-all cursor-pointer ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Machine selector inside top control bar */}
          <div className="flex items-center gap-1 py-2">
            {["MC_01", "MC_02", "MC_03", "MC_04", "MC_05"].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMachine(m)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  selectedMachine === m
                    ? "bg-secondary text-primary border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6 overflow-y-auto">
          
          {/* Connection Offline Alert */}
          {!isBackendConnected && (
            <Alert className="border-red-200 bg-red-500/5 text-red-655 dark:text-red-400 rounded-xl shadow-none">
              <WifiOff className="h-4 w-4 text-red-500" />
              <AlertTitle className="font-bold">FastAPI Connection Offline</AlertTitle>
              <AlertDescription className="text-xs mt-1 leading-relaxed">
                SCADA Dashboard cannot sync live telemetry at <code className="bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded font-mono font-bold text-red-900 dark:text-red-400">{BACKEND_URL}</code>. 
                Please start the python server to resume automatic updates.
              </AlertDescription>
            </Alert>
          )}

          {isLoading && isBackendConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-32">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Acquiring PLC Telemetry...
              </span>
            </div>
          ) : (
            <div className="space-y-6">

              {/* 1. DASHBOARD & ALARMS VIEW */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  
                  {/* Telemetry Section Title */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                      </span>
                      <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        Live stream &bull; {selectedMachine}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border">
                      Virtual Clock: {activeMachineData.Time || "Loading..."}
                    </span>
                  </div>

                  {/* Horizontal Gauges Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <TelemetryCard
                      label="Temperature"
                      value={activeMachineData.Temperature}
                      min={30}
                      max={120}
                      unit="°C"
                      warnThreshold={70}
                      critThreshold={80}
                    />
                    <TelemetryCard
                      label="Pressure"
                      value={activeMachineData.Pressure}
                      min={10}
                      max={80}
                      unit="PSI"
                      warnThreshold={48}
                      critThreshold={55}
                    />
                    <TelemetryCard
                      label="Vibration"
                      value={activeMachineData.Vibration}
                      min={0.5}
                      max={10.0}
                      unit="mm/s"
                      warnThreshold={4.0}
                      critThreshold={5.0}
                    />
                    <TelemetryCard
                      label="Voltage"
                      value={activeMachineData.Voltage}
                      min={170}
                      max={260}
                      unit="V"
                      warnThreshold={(v) => v < 200 || v > 240}
                      critThreshold={(v) => v < 190 || v > 245}
                    />
                    <TelemetryCard
                      label="Current"
                      value={activeMachineData.Current}
                      min={2}
                      max={30}
                      unit="A"
                      warnThreshold={17}
                      critThreshold={20}
                    />
                  </div>

                  {/* Combined Section: Active Alarms and Nodes List */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                    
                    {/* Alarms Feed Card */}
                    <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                            System Alarm Log
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Recent safety parameter violations registered by PLC rules
                          </p>
                        </div>
                        <Badge className="bg-secondary text-foreground border border-border/80 font-bold px-2 py-0.5 rounded text-[10px] shadow-none">
                          {alerts.slice(0, 20).length} Alerts
                        </Badge>
                      </div>

                      <div className="border-l border-border/60 pl-4 ml-2 space-y-4 max-h-[350px] overflow-y-auto">
                        {alerts.length > 0 ? (
                          alerts.slice(0, 15).map((alert) => {
                            const isCritical = alert.severity === "CRITICAL";
                            return (
                              <div key={alert.id} className="relative flex items-start gap-3 text-xs py-0.5">
                                {/* Timeline Dot */}
                                <span className={`absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-background transition-colors duration-305 ${isCritical ? "border-red-500" : "border-amber-500"}`} />
                                <div className="flex-1 space-y-1">
                                  <div className="flex justify-between items-baseline gap-2">
                                    <span className="font-bold text-foreground">{alert.machine} &bull; <strong className="text-primary font-bold">{alert.parameter}</strong></span>
                                    <span className="font-mono text-[9px] text-muted-foreground">{alert.time.split(" ")[1] || alert.time}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                                    <span>Value: <strong className="text-red-600 dark:text-red-400 font-mono font-bold">{alert.value.toFixed(2)}</strong></span>
                                    <span>Limit: {alert.threshold.toFixed(1)}</span>
                                    <span className={`text-[9px] font-extrabold uppercase px-1 rounded ${isCritical ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                                      {alert.severity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-center space-y-2">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                            <h4 className="text-xs font-bold text-foreground">All Systems Healthy</h4>
                            <p className="text-[10px] text-muted-foreground">All telemetry parameters are operating below warning limits.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nodes Status list */}
                    <div className="bg-card rounded-xl border border-border/60 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Activity className="h-4.5 w-4.5 text-primary" />
                            PLC Node Rack
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Live summaries across all virtual units
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {currentReadings.map((mach) => {
                          const isAlerting = mach.Fault === 1 || mach.Temperature > 80.0 || mach.Vibration > 5.0;
                          return (
                            <div
                              key={mach.Machine}
                              onClick={() => setSelectedMachine(mach.Machine)}
                              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer flex justify-between items-center ${
                                selectedMachine === mach.Machine
                                  ? "bg-secondary/60 border-primary/30"
                                  : "bg-card border-border/40 hover:border-primary/20"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${isAlerting ? "bg-red-500 animate-pulse" : "bg-primary"}`} />
                                <span className="text-xs font-bold text-foreground">{mach.Machine}</span>
                              </div>
                              <div className="flex gap-3 text-[10px] font-mono text-muted-foreground font-semibold">
                                <span>{mach.Temperature.toFixed(0)}°C</span>
                                <span>{mach.Vibration.toFixed(1)} mm/s</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* 2. SENSOR TRENDS & ANALYTICS VIEW */}
              {activeTab === "trends" && (
                <div className="space-y-6">
                  
                  {/* SaaS Metric Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Temp Stats Card */}
                    <div className="bg-card border border-border/60 rounded-xl p-5 space-y-2">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">
                        Temperature averages ({selectedMachine})
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-foreground font-mono">
                          {machineStats.temp.avg.toFixed(1)}°C
                        </span>
                        <div className="flex gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider">
                          <span className="text-red-500">Max {machineStats.temp.max.toFixed(0)}°</span>
                          <span className="text-primary">Min {machineStats.temp.min.toFixed(0)}°</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-semibold">
                        Calculated mean from active history data buffer
                      </p>
                    </div>

                    {/* Pressure Stats Card */}
                    <div className="bg-card border border-border/60 rounded-xl p-5 space-y-2">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">
                        Pressure averages ({selectedMachine})
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-foreground font-mono">
                          {machineStats.press.avg.toFixed(1)} PSI
                        </span>
                        <div className="flex gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider">
                          <span className="text-red-500">Max {machineStats.press.max.toFixed(0)}</span>
                          <span className="text-primary">Min {machineStats.press.min.toFixed(0)}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-semibold">
                        Optimal bounds: 30.0 - 45.0 PSI range
                      </p>
                    </div>

                    {/* Vibration Stats Card */}
                    <div className="bg-card border border-border/60 rounded-xl p-5 space-y-2">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">
                        Vibration averages ({selectedMachine})
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold text-foreground font-mono">
                          {machineStats.vib.avg.toFixed(2)} mm/s
                        </span>
                        <div className="flex gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider">
                          <span className="text-red-500">Max {machineStats.vib.max.toFixed(1)}</span>
                          <span className="text-primary">Min {machineStats.vib.min.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-semibold">
                        Vibration warning threshold level: 5.0 mm/s
                      </p>
                    </div>
                    
                  </div>

                  {/* Main Time-series Plots */}
                  <div className="bg-card border border-border/60 rounded-xl p-6 space-y-6">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4.5 w-4.5 text-primary" />
                        Time-Series Telemetry Analysis
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Continuous sensor metrics mapped across current run history
                      </p>
                    </div>

                    <div className="space-y-8">
                      {/* Grid for Temp & Pressure charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Temperature chart */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-widest">
                            Temperature Curve (°C)
                          </h4>
                          <div className="h-60 bg-transparent p-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={getSelectedMachineHistory()}>
                                <defs>
                                  <linearGradient id="colorTempGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#222d20" : "#e4ebe1"} vertical={false} />
                                <XAxis dataKey="Time" stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} tickFormatter={(t) => t.split(" ")[1] || t} />
                                <YAxis domain={["dataMin - 10", "dataMax + 10"]} stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px", color: "var(--foreground)" }} />
                                <Area type="monotone" dataKey="Temperature" name="Temp (°C)" stroke="var(--chart-1)" strokeWidth={1} fillOpacity={1} fill="url(#colorTempGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Pressure chart */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-widest">
                            Pressure Variance (PSI)
                          </h4>
                          <div className="h-60 bg-transparent p-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={getSelectedMachineHistory()}>
                                <defs>
                                  <linearGradient id="colorPressGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#222d20" : "#e4ebe1"} vertical={false} />
                                <XAxis dataKey="Time" stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} tickFormatter={(t) => t.split(" ")[1] || t} />
                                <YAxis domain={["dataMin - 5", "dataMax + 5"]} stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px", color: "var(--foreground)" }} />
                                <Area type="monotone" dataKey="Pressure" name="Pressure (PSI)" stroke="var(--chart-2)" strokeWidth={1} fillOpacity={1} fill="url(#colorPressGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                      </div>

                      {/* Vibration plot */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-widest">
                          Structural Vibration (mm/s)
                        </h4>
                        <div className="h-60 bg-transparent p-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getSelectedMachineHistory()}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#222d20" : "#e4ebe1"} vertical={false} />
                              <XAxis dataKey="Time" stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} tickFormatter={(t) => t.split(" ")[1] || t} />
                              <YAxis domain={[0, "dataMax + 2"]} stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px", color: "var(--foreground)" }} />
                              <Legend wrapperStyle={{ fontSize: "10px" }} />
                              <Line type="monotone" dataKey="Vibration" name="Vibration (mm/s)" stroke="var(--chart-3)" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descriptive Table & Bar Chart */}
                  {analytics && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Aggregated Machine metrics */}
                      <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-6 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            Aggregated Machine Metrics
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Average sensor telemetry registers sorted by node identifier
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <Table className="text-xs">
                            <TableHeader className="bg-secondary/40">
                              <TableRow className="border-b border-border/60">
                                <TableHead className="font-bold text-muted-foreground h-9 px-4">Node</TableHead>
                                <TableHead className="font-bold text-muted-foreground h-9 px-4">Avg Temp</TableHead>
                                <TableHead className="font-bold text-muted-foreground h-9 px-4">Max Temp</TableHead>
                                <TableHead className="font-bold text-muted-foreground h-9 px-4">Avg Vibration</TableHead>
                                <TableHead className="font-bold text-muted-foreground h-9 px-4">Max Vibration</TableHead>
                                <TableHead className="font-bold text-muted-foreground h-9 px-4 font-mono">Avg Load</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.keys(analytics.machine_averages).map((mach) => {
                                const stats = analytics.machine_averages[mach];
                                return (
                                  <TableRow key={mach} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                                    <TableCell className="font-bold text-foreground py-2.5 px-4">{mach}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground py-2.5 px-4">{stats.avg_temp.toFixed(1)}°C</TableCell>
                                    <TableCell className="font-mono text-muted-foreground py-2.5 px-4">{stats.max_temp.toFixed(1)}°C</TableCell>
                                    <TableCell className="font-mono text-muted-foreground py-2.5 px-4">{stats.avg_vibration.toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground py-2.5 px-4">{stats.max_vibration.toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-primary font-bold py-2.5 px-4">{stats.avg_power_kw.toFixed(2)} kW</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Power consumption chart */}
                      <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            Power Consumption (kW)
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Electrical workload consumption averages
                          </p>
                        </div>
                        <div className="h-60 pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.keys(analytics.machine_averages).map((mach) => ({
                              name: mach,
                              power: analytics.machine_averages[mach].avg_power_kw
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#222d20" : "#e4ebe1"} vertical={false} />
                              <XAxis dataKey="name" stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} />
                              <YAxis stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px", color: "var(--foreground)" }} />
                              <Bar dataKey="power" name="Avg Power (kW)" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                    </div>
                  )}

                </div>
              )}

              {/* 3. ML PREDICTOR VIEW (Elegant Sandbox with Sliders & Bold Results) */}
              {activeTab === "predictor" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Telemetry Input Sliders */}
                  <div className="lg:col-span-1 bg-card border border-border/60 rounded-xl p-6 space-y-4">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sliders className="h-4.5 w-4.5 text-primary" />
                        Simulation Sandbox
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Simulate sensor metrics to run diagnostic risk classifiers
                      </p>
                    </div>

                    <form onSubmit={runPrediction} className="space-y-4">
                      
                      {/* Temperature Slider */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-secondary/50 border border-border/60">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="uppercase tracking-widest">Temperature</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictInputs.Temperature.toFixed(1)} °C
                          </span>
                        </div>
                        <input
                          type="range"
                          min={30}
                          max={120}
                          step={0.5}
                          value={predictInputs.Temperature}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Temperature: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>30°C</span>
                          <span className={predictInputs.Temperature >= safeLimits.Temperature ? "text-red-500 font-bold" : "text-muted-foreground"}>Limit: {safeLimits.Temperature}°C</span>
                          <span>120°C</span>
                        </div>
                      </div>

                      {/* Vibration Slider */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-secondary/50 border border-border/60">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="uppercase tracking-widest">Vibration</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictInputs.Vibration.toFixed(1)} mm/s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={10.0}
                          step={0.1}
                          value={predictInputs.Vibration}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Vibration: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>0.5</span>
                          <span className={predictInputs.Vibration >= safeLimits.Vibration ? "text-red-500 font-bold" : "text-muted-foreground"}>Limit: {safeLimits.Vibration}</span>
                          <span>10.0</span>
                        </div>
                      </div>

                      {/* Pressure Slider */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-secondary/50 border border-border/60">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="uppercase tracking-widest">Pressure</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictInputs.Pressure.toFixed(1)} PSI
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={80}
                          step={0.5}
                          value={predictInputs.Pressure}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Pressure: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>10 PSI</span>
                          <span className={predictInputs.Pressure >= safeLimits.Pressure ? "text-red-500 font-bold" : "text-muted-foreground"}>Limit: {safeLimits.Pressure}</span>
                          <span>80 PSI</span>
                        </div>
                      </div>

                      {/* Voltage Slider */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-secondary/50 border border-border/60">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="uppercase tracking-widest">Voltage</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictInputs.Voltage.toFixed(0)} V
                          </span>
                        </div>
                        <input
                          type="range"
                          min={170}
                          max={260}
                          step={1}
                          value={predictInputs.Voltage}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Voltage: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>170 V</span>
                          <span className={predictInputs.Voltage >= safeLimits.Voltage || predictInputs.Voltage <= 190 ? "text-red-500 font-bold" : "text-muted-foreground"}>Safe: 190-240V</span>
                          <span>260 V</span>
                        </div>
                      </div>

                      {/* Current Slider */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-secondary/50 border border-border/60">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                          <span className="uppercase tracking-widest">Current</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictInputs.Current.toFixed(1)} A
                          </span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={30}
                          step={0.5}
                          value={predictInputs.Current}
                          onChange={(e) => setPredictInputs({ ...predictInputs, Current: parseFloat(e.target.value) || 0 })}
                          className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>2 A</span>
                          <span className={predictInputs.Current >= safeLimits.Current ? "text-red-500 font-bold" : "text-muted-foreground"}>Limit: {safeLimits.Current}</span>
                          <span>30 A</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isPredicting || !isBackendConnected}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-2.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {isPredicting ? "Computing Diagnosis..." : "Run Risk Classification"}
                      </button>

                    </form>
                  </div>

                  {/* Diagnostic Report: Large Minimal Text Indicator */}
                  <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-6 flex flex-col justify-between">
                    <div className="border-b border-border/40 pb-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BrainCircuit className="h-4.5 w-4.5 text-primary" />
                        ML Diagnostics Report
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Machine health risk classification assessment
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-start py-8">
                      {predictionResult ? (
                        <div className="w-full space-y-8">
                          
                          {/* Mega text indicator */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Failure risk assessment</span>
                            <div className="flex items-baseline gap-3">
                              <h2 className={`text-6xl md:text-7xl font-bold tracking-tighter font-mono leading-none ${
                                predictionResult.status === "Healthy"
                                  ? "text-primary"
                                  : predictionResult.status === "Warning"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-650 dark:text-red-400"
                              }`}>
                                {predictionResult.failure_probability}%
                              </h2>
                              <Badge className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase shadow-none border ${
                                predictionResult.status === "Healthy"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : predictionResult.status === "Warning"
                                  ? "bg-amber-500/10 text-amber-655 border-amber-500/20"
                                  : "bg-red-500/10 text-red-655 border-red-500/20"
                              }`}>
                                {predictionResult.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Action Directives */}
                          <div className="bg-secondary/75 p-5 rounded-xl border border-border/80 space-y-2 w-full max-w-lg">
                            <span className="block font-bold text-muted-foreground text-[8px] uppercase tracking-widest">
                              Directives
                            </span>
                            <div className="flex gap-2 text-xs text-foreground font-medium leading-relaxed">
                              <ChevronRight className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                              <span>{predictionResult.recommendation}</span>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-center text-muted-foreground text-center space-y-2 py-16">
                          <BrainCircuit className="h-10 w-10 text-muted/20 animate-pulse" />
                          <h4 className="text-xs font-bold text-foreground">
                            Classifier Ready
                          </h4>
                          <p className="text-[10px] text-muted-foreground max-w-xs">
                            Configure simulation variables using the sliders on the left and run diagnostics to fetch failure predictions.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
