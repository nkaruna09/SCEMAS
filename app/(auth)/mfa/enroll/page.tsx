'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'loading' | 'scan' | 'verify' | 'done' | 'error'

export default function MfaEnrollPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('loading')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    enroll()
  }, [])

  async function enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error || !data) {
      setError(error?.message ?? 'Failed to start enrollment')
      setStep('error')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('scan')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? 'Challenge failed')
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.replace(/\s/g, ''),
    })

    if (verifyError) {
      setError('Incorrect code — try again')
      setLoading(false)
      return
    }

    setStep('done')
    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set up two-factor authentication</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your account requires MFA. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.).
          </p>
        </div>

        {step === 'loading' && (
          <p className="text-sm text-gray-500 text-center">Generating QR code...</p>
        )}

        {step === 'error' && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {step === 'scan' && (
          <div className="space-y-5">
            <div className="flex justify-center">
              {/* qr_code is an SVG data URL from Supabase */}
              <img src={qrCode} alt="MFA QR code" className="w-48 h-48 rounded border" />
            </div>

            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Can't scan? Enter code manually</summary>
              <p className="mt-2 font-mono break-all bg-gray-50 rounded p-2 select-all">{secret}</p>
            </details>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="code">
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.replace(/\s/g, '').length < 6}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Confirm and enable MFA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
