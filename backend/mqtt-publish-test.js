//simulate sensor publish to hivemq
// run with node mqtt-publish-test.js

const mqtt = require('mqtt')

const BROKER_URL = 'mqtts://db47f22de22643b0a64e5e5856af2e9a.s1.eu.hivemq.cloud:8883'
const MQTT_USER  = process.env.MQTT_USER || 'your-hivemq-username'
const MQTT_PASS  = process.env.MQTT_PASS || 'your-hivemq-password'
const TOPIC      = 'scemas/readings'
const APP_URL    = process.env.FRONTEND_URL || 'http://localhost:3000'

//send 10 rising air_quality readings to trigger trend and predicted alerts
const readings = [100, 110, 115, 120, 125, 130, 135, 140, 143, 146]

async function getSensorAndZone(metricType) {
  //look up a live sensor from the public api so we dont hardcode IDs
  const res = await fetch(`${APP_URL}/api/public/sensors?metric_type=${metricType}`)
  const { sensors } = await res.json()
  if (!sensors || sensors.length === 0) throw new Error(`no active sensors for metric_type=${metricType}`)
  const sensor = sensors[0]
  if (!sensor.zone_id) throw new Error(`sensor ${sensor.id} has no zone_id — run: UPDATE sensors SET zone_id = '<zone>' WHERE id = '${sensor.id}'`)
  return { sensor_id: sensor.id, zone_id: sensor.zone_id }
}

const client = mqtt.connect(BROKER_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: 'mqtts',
})

client.on('connect', async () => {
  console.log('connected to HiveMQ- looking up sensor...')

  let sensor_id, zone_id
  try {
    ;({ sensor_id, zone_id } = await getSensorAndZone('air_quality'))
    console.log(`using sensor ${sensor_id} in zone ${zone_id}`)
  } catch (err) {
    console.error('could not find sensor:', err.message)
    client.end()
    return
  }

  console.log('publishing test readings...')
  for (const value of readings) {
    const payload = JSON.stringify({ sensor_id, zone_id, metric_type: 'air_quality', value })
    await new Promise((resolve, reject) => {
      client.publish(TOPIC, payload, (err) => {
        if (err) reject(err)
        else { console.log(`published air_quality=${value}`); resolve() }
      })
    })
    await new Promise(r => setTimeout(r, 400))
  }

  console.log('done — check the Alerts page for trend/predicted badges')
  client.end()
})

client.on('error', (err) => {
  console.error('MQTT error:', err.message)
  process.exit(1)
})
