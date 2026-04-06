import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LOOKBACK = 10
const TREND_RUN = 5
const SPIKE_THRESHOLD = 2.5

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function stddev(vals: number[], avg: number): number {
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length
  return Math.sqrt(variance)
}

function detectAnomaly(values: number[]): string | null {
  if (values.length < TREND_RUN) return null

  const recent = values.slice(0, TREND_RUN)
  let allUp = true
  let allDown = true
  for (let i = 0; i < recent.length - 1; i++) {
    if (recent[i] <= recent[i + 1]) allUp = false
    if (recent[i] >= recent[i + 1]) allDown = false
  }
  if (allUp) return 'trend_up'
  if (allDown) return 'trend_down'

  // Spike: latest value is more than SPIKE_THRESHOLD std deviations from the baseline mean
  if (values.length >= 3) {
    const baseline = values.slice(1)
    const avg = mean(baseline)
    const sd = stddev(baseline, avg)
    if (sd > 0 && Math.abs(values[0] - avg) > SPIKE_THRESHOLD * sd) {
      return 'spike'
    }
  }
  return null
}

export async function runTrendDetection(sensor_id: string, metric_type: string, latestValue: number) {
  const { data: readings, error } = await supabaseAdmin
    .from('telemetry_readings')
    .select('value')
    .eq('sensor_id', sensor_id)
    .eq('metric_type', metric_type)
    .order('timestamp', { ascending: false })
    .limit(LOOKBACK)
  if (error || !readings || readings.length < TREND_RUN) return

  const values = readings.map((r) => Number(r.value))
  const anomaly = detectAnomaly(values)

  if (!anomaly) return

  // Skip if an active trend alert already exists for this sensor (no rule_id = trend alert)
  const { data: existing } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('sensor_id', sensor_id)
    .eq('status', 'active')
    .is('rule_id', null)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabaseAdmin.from('alerts').insert({
    sensor_id,
    rule_id: null,
    value: latestValue,
    status: 'active',
    alert_type: 'trend',
  })

  console.info(`trend alert created for sensor ${sensor_id}: ${anomaly}`)
}
