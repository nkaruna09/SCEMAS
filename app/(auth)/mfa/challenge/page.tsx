'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MfaChallengePage() {
  const router = useRouter()
  const supabase = createClient()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialising, setInitialising] = useState(true)

  useEffect(() => {
    startChallenge()
  }, [])

  async function startChallenge() {
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError || !factors?.totp?.length) {
      setError('No MFA factor found. Please contact an administrator.')
      setInitialising(false)
      return
    }

    const totp = factors.totp[0]
    setFactorId(totp.id)

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Failed to start MFA challenge')
      setInitialising(false)
      return
    }

    setChallengeId(challenge.id)
    setInitialising(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || !challengeId) return
    setLoading(true)
    setError(null)

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.replace(/\s/g, ''),
    })

    if (verifyError) {
      setError('Incorrect code — try again')
      setLoading(false)
      // Challenges expire after a short window; re-issue one on failure
      startChallenge()
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Two-factor authentication</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {initialising ? (
          <p className="text-sm text-gray-500 text-center">Loading...</p>
        ) : error && !challengeId ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="code">
                Authenticator code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
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
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}

        <p className="text-xs text-center text-gray-400">
          Signed in as the wrong account?{' '}
          <button
            className="text-blue-500 hover:underline"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
          >
            Sign out
          </button>
        </p>
      </div>
    </main>
  )
}
