import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

//how many past readings to base the forecast on
const LOOKBACK = 10
//how many steps ahead to project
const FORECAST_STEPS = 5

//simple linear regression slope over an ordered series (index 0 = oldest)
function linearSlope(values: number[]): number {
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0)
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
}

function projectValue(values: number[], steps: number): number {
  const slope = linearSlope(values)
  return values[values.length - 1] + slope * steps
}

function wouldViolate(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':  return value > threshold
    case '<':  return value < threshold
    case '>=': return value >= threshold
    case '<=': return value <= threshold
    case '=':  return value === threshold
    default:   return false
  }
}

export async function runPrediction(sensor_id: string, metric_type: string) {
  //fetch recent readings oldestfirst so slope is meaningful
  const { data: readings, error } = await supabaseAdmin
    .from('telemetry_readings')
    .select('value')
    .eq('sensor_id', sensor_id)
    .eq('metric_type', metric_type)
    .order('timestamp', { ascending: false })
    .limit(LOOKBACK)

  if (error || !readings || readings.length < 3) return

  //reverse so index 0 is oldest
  const values = readings.map((r) => Number(r.value)).reverse()

  //fetch alert rules for this metric type
  const { data: rules } = await supabaseAdmin
    .from('alert_rules')
    .select('id, operator, threshold_value, severity')
    .eq('metric_type', metric_type)

  if (!rules || rules.length === 0) return

  for (const rule of rules) {
    const predicted = projectValue(values, FORECAST_STEPS)

    if (!wouldViolate(predicted, rule.operator, Number(rule.threshold_value))) continue

    //skip ifpredicted alert already exists for this sensor + rule
    const { data: existing } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('sensor_id', sensor_id)
      .eq('rule_id', rule.id)
      .eq('status', 'active')
      .eq('alert_type', 'predicted')
      .limit(1)

    if (existing && existing.length > 0) continue

    await supabaseAdmin.from('alerts').insert({
      sensor_id,
      rule_id: rule.id,
      value: Math.round(predicted * 100) / 100,
      status: 'active',
      alert_type: 'predicted',
    })

    console.info(`predictive alert for sensor ${sensor_id}: projected ${predicted.toFixed(2)} ${rule.operator} ${rule.threshold_value}`)
  }
}
