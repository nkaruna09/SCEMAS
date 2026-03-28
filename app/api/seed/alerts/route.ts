import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    // First, create some placeholder zones
    const { data: existingZones } = await supabase
      .from('zones')
      .select('*')
      .limit(1)

    let zone
    if (!existingZones || existingZones.length === 0) {
      const { data: createdZone } = await supabase
        .from('zones')
        .insert([
          {
            name: 'Downtown District',
            geojson_boundary: null,
          },
          {
            name: 'Waterfront Area',
            geojson_boundary: null,
          },
        ])
        .select()
        .single()

      zone = createdZone
    } else {
      zone = existingZones[0]
    }

    // Create placeholder sensors
    const { data: existingSensors } = await supabase
      .from('sensors')
      .select('*')

    let sensors = existingSensors || []

    if (sensors.length === 0) {
      const { data: createdSensors } = await supabase
        .from('sensors')
        .insert([
          {
            name: 'Temperature Sensor - Central Station',
            zone_id: zone?.id,
            metric_type: 'temperature',
            status: 'active',
            approved: true,
          },
          {
            name: 'Humidity Sensor - Library',
            zone_id: zone?.id,
            metric_type: 'humidity',
            status: 'active',
            approved: true,
          },
          {
            name: 'Air Quality Sensor - Park',
            zone_id: zone?.id,
            metric_type: 'air_quality',
            status: 'active',
            approved: true,
          },
          {
            name: 'Pressure Sensor - Harbor',
            zone_id: zone?.id,
            metric_type: 'pressure',
            status: 'active',
            approved: true,
          },
          {
            name: 'Temperature Sensor - Hospital',
            zone_id: zone?.id,
            metric_type: 'temperature',
            status: 'active',
            approved: true,
          },
        ])
        .select()

      sensors = createdSensors || []
    }

    // Create alert rules
    const { data: existingRules } = await supabase
      .from('alert_rules')
      .select('*')

    let rules = existingRules || []

    if (rules.length === 0) {
      const { data: createdRules } = await supabase
        .from('alert_rules')
        .insert([
          {
            metric_type: 'temperature',
            threshold_value: 35,
            operator: '>',
            severity: 'high',
          },
          {
            metric_type: 'humidity',
            threshold_value: 80,
            operator: '>',
            severity: 'medium',
          },
          {
            metric_type: 'air_quality',
            threshold_value: 150,
            operator: '>',
            severity: 'critical',
          },
          {
            metric_type: 'pressure',
            threshold_value: 950,
            operator: '<',
            severity: 'low',
          },
        ])
        .select()

      rules = createdRules || []
    }

    // Create fake alerts
    const now = new Date()
    const fakeAlerts = [
      {
        rule_id: rules[0]?.id,
        sensor_id: sensors[0]?.id,
        value: 38.5,
        status: 'active',
        triggered_at: new Date(now.getTime() - 5 * 60000).toISOString(), // 5 mins ago
      },
      {
        rule_id: rules[1]?.id,
        sensor_id: sensors[1]?.id,
        value: 85.2,
        status: 'active',
        triggered_at: new Date(now.getTime() - 15 * 60000).toISOString(), // 15 mins ago
      },
      {
        rule_id: rules[2]?.id,
        sensor_id: sensors[2]?.id,
        value: 180,
        status: 'acknowledged',
        triggered_at: new Date(now.getTime() - 30 * 60000).toISOString(), // 30 mins ago
      },
      {
        rule_id: rules[0]?.id,
        sensor_id: sensors[4]?.id,
        value: 36.8,
        status: 'active',
        triggered_at: new Date(now.getTime() - 2 * 60000).toISOString(), // 2 mins ago
      },
      {
        rule_id: rules[3]?.id,
        sensor_id: sensors[3]?.id,
        value: 920,
        status: 'resolved',
        triggered_at: new Date(now.getTime() - 60 * 60000).toISOString(), // 1 hour ago
        resolved_at: new Date(now.getTime() - 45 * 60000).toISOString(),
      },
      {
        rule_id: rules[1]?.id,
        sensor_id: sensors[0]?.id,
        value: 82.1,
        status: 'acknowledged',
        triggered_at: new Date(now.getTime() - 45 * 60000).toISOString(), // 45 mins ago
      },
      {
        rule_id: rules[2]?.id,
        sensor_id: sensors[1]?.id,
        value: 165,
        status: 'active',
        triggered_at: new Date(now.getTime() - 10 * 60000).toISOString(), // 10 mins ago
      },
    ]

    const { data: insertedAlerts, error } = await supabase
      .from('alerts')
      .insert(fakeAlerts)
      .select()

    if (error) {
      return Response.json(
        { error: `Failed to create alerts: ${error.message}` },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      message: 'Fake data created successfully',
      zonesCreated: existingZones && existingZones.length > 0 ? 0 : 2,
      sensorsCreated: sensors.length,
      rulesCreated: rules.length,
      alertsCreated: insertedAlerts?.length || 0,
    })
  } catch (error) {
    console.error('Error seeding data:', error)
    return Response.json(
      { error: `Server error: ${String(error)}` },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Delete alerts first (foreign key constraints)
    const { error: alertsError } = await supabase
      .from('alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (alertsError) throw alertsError

    // Delete alert rules
    const { error: rulesError } = await supabase
      .from('alert_rules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (rulesError) throw rulesError

    // Delete sensors
    const { error: sensorsError } = await supabase
      .from('sensors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (sensorsError) throw sensorsError

    // Delete zones
    const { error: zonesError } = await supabase
      .from('zones')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (zonesError) throw zonesError

    return Response.json({
      success: true,
      message: 'All seeded data has been deleted successfully',
    })
  } catch (error) {
    console.error('Error resetting data:', error)
    return Response.json(
      { error: `Failed to reset data: ${String(error)}` },
      { status: 500 }
    )
  }
}
