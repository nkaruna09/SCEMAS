'use client'

import { useState } from 'react'

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [data, setData] = useState<any>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleSeedAlerts = async () => {
    try {
      setLoading(true)
      setMessage('')
      setData(null)

      const response = await fetch('/api/seed/alerts', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(`❌ Error: ${result.error}`)
        return
      }

      setData(result)
      setMessage(
        `✅ Successfully created demo data!`
      )
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      setLoading(true)
      setMessage('')

      const response = await fetch('/api/seed/alerts', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(`❌ Error: ${result.error}`)
        setShowResetConfirm(false)
        return
      }

      setData(null)
      setShowResetConfirm(false)
      setMessage(
        `✅ All demo data has been cleared!`
      )
    } catch (error) {
      setMessage(`❌ Error: ${String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-4">Seed Demo Data</h1>
          <p className="text-gray-600 mb-6">
            This page creates placeholder data for development and testing purposes.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">What gets created:</h2>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>2 placeholder zones (Downtown District, Waterfront Area)</li>
              <li>5 placeholder sensors (temperature, humidity, air quality, pressure)</li>
              <li>4 alert rules with different severity levels</li>
              <li>7 sample alerts with mixed statuses (active, acknowledged, resolved)</li>
            </ul>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleSeedAlerts}
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading && !showResetConfirm ? 'Creating data...' : 'Seed Demo Data'}
            </button>
            
            <button
              onClick={() => setShowResetConfirm(!showResetConfirm)}
              disabled={loading}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Reset Data
            </button>
          </div>

          {/* Reset Confirmation */}
          {showResetConfirm && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-900 font-medium mb-3">
                Are you sure you want to delete all demo data? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className={`flex-1 py-2 px-4 rounded font-medium text-white transition-colors ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete All'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded font-medium bg-gray-300 hover:bg-gray-400 transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {data && message.includes('✅') && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Created:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ Zones: {data.zonesCreated}</li>
                <li>✓ Sensors: {data.sensorsCreated}</li>
                <li>✓ Alert Rules: {data.rulesCreated}</li>
                <li>✓ Alerts: {data.alertsCreated}</li>
              </ul>
            </div>
          )}

          {data && message.includes('✅') && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-3">
                You can now view the created data at:
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/city-operator/alerts" className="text-blue-600 hover:underline">
                    → City Operator Alerts
                  </a>
                </li>
                <li>
                  <a href="/city-operator/alert-rules" className="text-blue-600 hover:underline">
                    → City Operator Alert Rules
                  </a>
                </li>
                <li>
                  <a href="/city-operator" className="text-blue-600 hover:underline">
                    → City Operator Dashboard
                  </a>
                </li>
                <li>
                  <a href="/system-admin/alerts" className="text-blue-600 hover:underline">
                    → System Admin Alerts
                  </a>
                </li>
                <li>
                  <a href="/system-admin/alert-rules" className="text-blue-600 hover:underline">
                    → System Admin Alert Rules
                  </a>
                </li>
                <li>
                  <a href="/system-admin" className="text-blue-600 hover:underline">
                    → System Admin Dashboard
                  </a>
                </li>
              </ul>
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-2">ℹ️ About This</h3>
            <p className="text-sm text-gray-600">
              This creates placeholder data only when it doesn't exist. Running it multiple times will not duplicate data.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Requires: SUPABASE_SERVICE_ROLE_KEY environment variable configured
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
