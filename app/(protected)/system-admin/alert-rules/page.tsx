'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type AlertRule = Database['public']['Tables']['alert_rules']['Row']

type FormDataType = {
  metric_type: string
  threshold_value: string
  operator: '>' | '<' | '>=' | '<=' | '='
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormDataType>({
    metric_type: '',
    threshold_value: '',
    operator: '>',
    severity: 'medium',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching alert rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'threshold_value' ? parseFloat(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.metric_type || !formData.threshold_value) {
      alert('Please fill in all fields')
      return
    }

    try {
      const payload = {
        metric_type: formData.metric_type,
        threshold_value: parseFloat(formData.threshold_value),
        operator: formData.operator,
        severity: formData.severity,
      }

      if (editingId) {
        // Update via API route (forwards to FastAPI AlertEvaluator)
        const response = await fetch(`/api/alert-rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Failed to update alert rule')
      } else {
        // Create via API route (forwards to FastAPI AlertEvaluator)
        const response = await fetch('/api/alert-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Failed to create alert rule')
      }

      setFormData({
        metric_type: '',
        threshold_value: '',
        operator: '>',
        severity: 'medium',
      })
      setEditingId(null)
      setShowForm(false)
      fetchRules()
    } catch (error) {
      console.error('Error saving alert rule:', error)
      alert('Error saving alert rule')
    }
  }

  const handleEdit = (rule: AlertRule) => {
    setFormData({
      metric_type: rule.metric_type,
      threshold_value: rule.threshold_value.toString(),
      operator: rule.operator,
      severity: rule.severity,
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return

    try {
      // Delete via API route (forwards to FastAPI AlertEvaluator)
      const response = await fetch(`/api/alert-rules/${ruleId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete alert rule')
      fetchRules()
    } catch (error) {
      console.error('Error deleting alert rule:', error)
      alert('Error deleting alert rule')
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Alert Rules</h1>
        <p className="text-gray-500 mt-1">Loading alert rules...</p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Alert Rules</h1>
          <p className="text-gray-500 mt-1">Configure metric thresholds and severity levels.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              metric_type: '',
              threshold_value: '',
              operator: '>',
              severity: 'medium',
            })
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Alert Rule' : 'Create New Alert Rule'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric Type
                </label>
                <input
                  type="text"
                  name="metric_type"
                  value={formData.metric_type}
                  onChange={handleInputChange}
                  placeholder="e.g. temperature, humidity, air_quality"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Value
                </label>
                <input
                  type="number"
                  name="threshold_value"
                  value={formData.threshold_value}
                  onChange={handleInputChange}
                  placeholder="e.g. 35.5"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <select
                  name="operator"
                  value={formData.operator}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value=">">Greater than (&gt;)</option>
                  <option value="<">Less than (&lt;)</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                  <option value="=">=</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                {editingId ? 'Update Rule' : 'Create Rule'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No alert rules found. Create one to get started!
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Metric Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Condition</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Severity</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {rule.metric_type}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">
                    {rule.operator} {rule.threshold_value}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[rule.severity]}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rule.created_at ? new Date(rule.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Rules</p>
          <p className="text-2xl font-bold text-blue-600">{rules.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Critical</p>
          <p className="text-2xl font-bold text-red-600">
            {rules.filter(r => r.severity === 'critical').length}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">High</p>
          <p className="text-2xl font-bold text-orange-600">
            {rules.filter(r => r.severity === 'high').length}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Medium</p>
          <p className="text-2xl font-bold text-yellow-600">
            {rules.filter(r => r.severity === 'medium').length}
          </p>
        </div>
      </div>
    </main>
  )
}
