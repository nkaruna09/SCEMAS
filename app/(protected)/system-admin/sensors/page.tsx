"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
 
type Sensor = Database["public"]["Tables"]["sensors"]["Row"];
export default function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  useEffect(() => {
    fetchSensors();
  }, []);

const fetchSensors = async () => {
  try {
    const { data, error } = await supabase
      .from("sensors")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const sensorsData: Sensor[] = data || [];
    const hasPending = sensorsData.some((s) => s.status === "inactive");
    // sample sensor (only if none exist)
    const fallbackPending: Sensor = {
      id: "demo-pending",
      name: "Temperatire Sensor B",
      metric_type: "temperature",
      zone_id: "sample_zone",
      status: "inactive",
      approved: false,
      created_at: new Date().toISOString(),
    } as Sensor;

    setSensors(hasPending ? sensorsData : [...sensorsData, fallbackPending]);

  } catch (error) {
    console.error("Error fetching sensors:", error);

    // backup data for test/placholder
    setSensors([
      {
        id: "1",
        name: "Temperature Sensor A",
        metric_type: "temperature",
        zone_id: "zone-1",
        status: "active",
        created_at: new Date().toISOString(),
      } as Sensor
    ]);
  } finally {
    setLoading(false);
  }
};

  const handleApprove = async (id: string) => {
    await supabase
      .from("sensors")
      .update({ status: "active" })
      .eq("id", id);
    setSensors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "active" } : s))
    );
  };

  const handleRemove = async (id: string) => {
    await supabase.from("sensors").delete().eq("id", id);
    setSensors((prev) => prev.filter((s) => s.id !== id));
  };

  const activeCount = sensors.filter((s) => s.status === "active").length;
  const pendingCount = sensors.filter((s) => s.status === "inactive").length;

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/*header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Sensor Management
        </h1>
        <p className="text-gray-500 mt-1">
          Approve and manage registered sensors.
        </p>
      </div>

      {/* view stats at top */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Sensors", value: sensors.length.toString(), color: "text-gray-900" },
          { label: "Active Sensors", value: activeCount.toString(), color: "text-green-600" },
          { label: "Pending Approval", value: pendingCount.toString(), color: "text-yellow-600" },
          { label: "System Status", value: "Operational", color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/*Sensors table */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900"> Sensors </h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"> Register Sensor </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading sensors...</div>
        ) : sensors.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No sensors found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 border-b">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Metric</th>
                  <th className="py-2">Zone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.id} className="border-b last:border-none">
                    <td className="py-3 text-gray-800">{sensor.name}</td>
                    <td className="py-3">{sensor.metric_type}</td>
                    <td className="py-3">{sensor.zone_id}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          sensor.status === "active"
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      > {sensor.status}</span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {sensor.status === "inactive" && (
                        <button
                          onClick={() => handleApprove(sensor.id)}
                          className="px-3 py-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                          Approve
                        </button>
                      )}
                      <button onClick={() => handleRemove(sensor.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"> Remove </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}