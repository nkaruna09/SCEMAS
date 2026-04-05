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

const ALL_ROLES: Role[] = ["city_operator", "system_admin", "government_official", "emergency_services"];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("city_operator");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", role: "city_operator" as Role });
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data: User[]) => setUsers(data))
      .catch(() => setUsers([]));
  };

  const handleEditStart = (user: User) => {
    setEditingId(user.id);
    setEditRole(user.role);
  };

  const handleEditSave = async (userId: string) => {
    setSaving(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole }),
    });

    if (res.ok) {
      setUsers(users.map((u) => u.id === userId ? { ...u, role: editRole } : u));
      setEditingId(null);
    } else {
      alert("failed to update role");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user? This will delete their account.")) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
    } else {
      alert("failed to remove user");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setSaving(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });

    if (res.ok) {
      const newUser: User = await res.json();
      setUsers([...users, newUser]);
      setShowAddModal(false);
      setAddForm({ email: "", password: "", role: "city_operator" });
    } else {
      const err = await res.json();
      setAddError(err.error ?? "failed to create user");
    }
    setSaving(false);
  };

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">View and manage user roles.</p>
      </div>

      {/* quick stats */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { label: "Total Users", value: users.length, color: "text-gray-900" },
          { label: "System Admins", value: users.filter(u => u.role === "system_admin").length, color: "text-blue-600" },
          { label: "City Operators", value: users.filter(u => u.role === "city_operator").length, color: "text-green-600" },
          { label: "Government Officials", value: users.filter(u => u.role === "government_official").length, color: "text-purple-600" },
          { label: "Emergency Services", value: users.filter(u => u.role === "emergency_services").length, color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Users table */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
          >
            Add User
          </button>
        </div>

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
                  <td className="py-3">
                    {editingId === user.id ? (
                      //inline role dropdown when editing
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[user.role]
                    )}
                  </td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    {editingId === user.id ? (
                      <>
                        <button
                          onClick={() => handleEditSave(user.id)}
                          disabled={saving}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(user)}
                          className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* role info + controls */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Role Permissions</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• System Admin: Full system access</p>
            <p>• City Operator: Manage alerts and telemetry</p>
            <p>• Government Official: View reports and analytics</p>
            <p>• Emergency Services: View active alerts only</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">User Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
            >
              Add User
            </button>
          </div>
        </div>
      </section>

      {/* add user modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(""); }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
