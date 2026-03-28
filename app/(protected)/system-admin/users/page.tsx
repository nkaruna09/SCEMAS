"use client";

import { useState, useEffect } from "react";
import type { Role } from "@/lib/types/roles";

type User = {
  id: string;
  username: string;
  role: Role;
  status: string;
};

const ROLE_LABELS: Record<Role, string> = {
  city_operator: "City Operator",
  system_admin: "System Admin",
  government_official: "Government Official",
  emergency_services: "Emergency Services",
};

export default function Users() {

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // fetch users from backend
    fetch("/api/users")
      .then((res) => res.json())
      .then((data: User[]) => {

        const rolesPresent = new Set(data.map((u) => u.role));

        const fallbackUsers: User[] = [
          {
            id: "demo-admin",
            username: "admin_demo",
            role: "system_admin",
            status: "Active",
          },
          {
            id: "demo-operator",
            username: "operator_demo",
            role: "city_operator",
            status: "Active",
          },
          {
            id: "demo-gov",
            username: "gov_demo",
            role: "government_official",
            status: "Active",
          },
          {
            id: "demo-emergency",
            username: "emergency_demo",
            role: "emergency_services",
            status: "Active",
          },
        ];

        const missingUsers = fallbackUsers.filter(
          (u) => !rolesPresent.has(u.role)
        );

        setUsers([...data, ...missingUsers]);
      })
      .catch(() => {
        // fallback placeholder data if backend not connected
        setUsers([
          {
            id: "1",
            username: "admin_1",
            role: "system_admin",
            status: "Active",
          },
          {
            id: "2",
            username: "operator_1",
            role: "city_operator",
            status: "Active",
          },
          {
            id: "3",
            username: "gov_1",
            role: "government_official",
            status: "Active",
          },
          {
            id: "4",
            username: "emergency_1",
            role: "emergency_services",
            status: "Active",
          },
        ]);
      });
  }, []);

  const handleDelete = async (id: string) => {
    // call backend delete endpoint
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    // update UI
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          User Management
        </h1>
        <p className="text-gray-500 mt-1">
          View and manage user roles.
        </p>
      </div>

      {/* Quick view stats */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { label: "Total Users", value: users.length.toString(), color: "text-gray-900" },
          { label: "System Admins", value: users.filter(u => u.role === "system_admin").length.toString(), color: "text-blue-600" },
          { label: "City Operators", value: users.filter(u => u.role === "city_operator").length.toString(), color: "text-green-600" },
          { label: "Government Officials", value: users.filter(u => u.role === "government_official").length.toString(), color: "text-purple-600" },
          { label: "Emergency Services", value: users.filter(u => u.role === "emergency_services").length.toString(), color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border" >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}> {stat.value} </p>
          </div>
        ))}
      </section>

      {/* Users table */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900"> Users </h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
            Add User
          </button>
        </div>

        {/* Placeholder table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="py-2">Username</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id || i} className="border-b last:border-none">
                  <td className="py-3 text-gray-800">{user.username}</td>
                  <td className="py-3">{ROLE_LABELS[user.role]}</td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* controls and System info*/}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* role info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            Role Permissions
          </h2>

          <div className="space-y-2 text-sm text-gray-700">
            <p>• System Admin: Full system access</p>
            <p>• City Operator: Manage alerts and telemetry</p>
            <p>• Government Official: View reports and analytics</p>
            <p>• Emergency Services: View active alerts only</p>
          </div>
        </div>

        {/* admin level controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> User Controls </h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"> Add User </button>
            <button className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> Bulk Edit </button>
            <button className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> Export User List </button>
          </div>
        </div>
      </section>
    </main>
  );
}