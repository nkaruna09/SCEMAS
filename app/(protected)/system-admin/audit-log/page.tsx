'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type AuditEntry = Database['public']['Tables']['audit_log']['Row']

export default function AuditLog() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    fetchAuditLog()
  }, [])

  const fetchAuditLog = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) {
      setError(error.message)
      setLogs([])
    } else {
      setLogs(data ?? [])
    }

    setLoading(false)
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const matchesTable = tableFilter ? entry.table_name === tableFilter : true
      const matchesAction = actionFilter ? entry.action === actionFilter : true
      return matchesTable && matchesAction
    })
  }, [logs, tableFilter, actionFilter])

  const dedup = (values: string[]) => Array.from(new Set(values)).sort()

  const renderAuditDetails = (entry: AuditEntry) => {
    if (entry.table_name === 'user_roles') {
      const affectedUserId = entry.new_val?.user_id || entry.old_val?.user_id
      if (entry.action === 'INSERT') {
        return <span>User <strong>{affectedUserId}</strong> assigned role: <strong>{entry.new_val?.role}</strong></span>
      } else if (entry.action === 'UPDATE') {
        return <span>User <strong>{affectedUserId}</strong> role changed from <strong>{entry.old_val?.role}</strong> to <strong>{entry.new_val?.role}</strong></span>
      } else if (entry.action === 'DELETE') {
        return <span>User <strong>{affectedUserId}</strong> role removed: <strong>{entry.old_val?.role}</strong></span>
      }
    } else if (entry.table_name === 'alert_rules') {
      if (entry.action === 'INSERT') {
        return <span>New alert rule created: {entry.new_val?.metric_type} {entry.new_val?.operator} {entry.new_val?.threshold_value} (severity: {entry.new_val?.severity})</span>
      } else if (entry.action === 'UPDATE') {
        const changes = []
        if (entry.old_val?.threshold_value !== entry.new_val?.threshold_value) {
          changes.push(`threshold: ${entry.old_val?.threshold_value} → ${entry.new_val?.threshold_value}`)
        }
        if (entry.old_val?.operator !== entry.new_val?.operator) {
          changes.push(`operator: ${entry.old_val?.operator} → ${entry.new_val?.operator}`)
        }
        if (entry.old_val?.severity !== entry.new_val?.severity) {
          changes.push(`severity: ${entry.old_val?.severity} → ${entry.new_val?.severity}`)
        }
        return <span>Alert rule updated: {entry.new_val?.metric_type} - {changes.join(', ')}</span>
      } else if (entry.action === 'DELETE') {
        return <span>Alert rule deleted: {entry.old_val?.metric_type} {entry.old_val?.operator} {entry.old_val?.threshold_value}</span>
      }
    } else if (entry.table_name === 'alerts') {
      if (entry.action === 'UPDATE') {
        if (entry.old_val?.status !== entry.new_val?.status) {
          return <span>Alert status changed from <strong>{entry.old_val?.status}</strong> to <strong>{entry.new_val?.status}</strong></span>
        }
      }
    }

    // Fallback to JSON for other tables
    return entry.action === 'DELETE' ? (
      <code>{JSON.stringify(entry.old_val, null, 2)}</code>
    ) : (
      <code>{JSON.stringify(entry.new_val ?? entry.old_val, null, 2)}</code>
    )
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">
          Records changes to sensors, alert rules, alerts, and user roles. Telemetry and account management events are tracked for audit and compliance.
        </p>
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium text-gray-600">Table:</label>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {dedup(logs.map((entry) => entry.table_name)).map((table) => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>

            <label className="text-sm font-medium text-gray-600">Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {dedup(logs.map((entry) => entry.action)).map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchAuditLog}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
          >
            Refresh Logs
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading audit logs...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-10">Error: {error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No audit entries available for selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Table</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 100).map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-700">{entry.user_id ?? 'system'}</td>
                    <td className="px-3 py-2 text-gray-700 uppercase">{entry.action}</td>
                    <td className="px-3 py-2 text-gray-700">{entry.table_name}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xl break-words">
                      {renderAuditDetails(entry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Audit Management Responsibilities</h2>
        <p className="text-sm text-gray-700">
          The audit system logs:
        </p>
        <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
          <li>Telemetry changes (sensor updates, alert rule threshold changes) via telemetry agent integration.</li>
          <li>Account changes (role updates, permission changes) via account management agent.</li>
          <li>Alert state updates and other system events for traceability and compliance.</li>
        </ul>
      </section>
    </main>
  )
}
