"use client";

import { useState } from "react";

export default function SystemAdminDashboard() {
  const [alerts] = useState([
    {
      title: "High Priotiry Alert",
      severity: "High",
      time: "[time delay --> xx mins ago]",
    },
    {
      title: "Mid Priority Alert",
      severity: "Medium",
      time: "XX mins ago",
    },
  ]);

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/*Title header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          System Administrator Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          System health, alerts, telemetry, and administrative controls.
        </p>
      </div>

      {/* quick view stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Active Alerts", value: alerts.length.toString(), color: "text-red-600" },
          { label: "Sensors Online", value: "num_online / num_offline", color: "text-green-600" },
          { label: "Sensors Within Thresholds", value: "lim_percent%", color: "text-yellow-600" },
          { label: "Last Update", value: "[T+ last update time]", color: "text-gray-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border" >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}> {stat.value} </p>
          </div>
        ))}
      </section>

      {/* Graph (to be done with python) */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900"> Telemetry Graphs</h2>
          <button className="text-sm text-blue-600 hover:underline"> View All </button>
        </div>
        {/* Placeholder graph (until graph gen service is implemented*/}
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl border-dashed border-2 border-gray-300 text-gray-400"> Graph Placeholder (Python-genrated graph goes here) </div>
      </section>

      {/* Alerts and logd*/}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> Active Alerts </h2>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center" >
                <div>
                  <p className="font-medium text-gray-800">{alert.title}</p>
                  <p className="text-sm text-gray-500">{alert.time}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    alert.severity === "High"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/*audit log */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> Audit Logs </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Update 1</p>
            <p>• Update 2</p>
          </div>
        </div>
      </section>

      {/* controls and System info*/}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* status updates */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            System Status
          </h2>

          <div className="space-y-2 text-sm text-gray-700">
            <p>• Telemetry ingestion: <span className="text-green-600">Operational</span></p>
            <p>• Alert processing: <span className="text-green-600">Operational</span></p>
            <p>• Graph generator: <span className="text-yellow-600">Delayed</span></p>
            <p>• API endpoint: <span className="text-green-600">Operational</span></p>
          </div>
        </div>

        {/* admin level controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> Admin Controls </h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"> Manage Users </button>
            <button className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> View Reports </button>
            <button className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> Edit Thresholds </button>
            <button className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm hover:bg-red-200"> Resolve Alerts </button>
          </div>
        </div>
      </section>
    </main>
  );
}