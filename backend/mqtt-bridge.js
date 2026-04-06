// brisge sub to hivemq and forwards messages to /api/ingest
//to run: node mqtt-bridge.js
// install run npm install mqtt node-fetch

const mqtt = require('mqtt')
//cluster connection
const BROKER_URL  = 'mqtts://db47f22de22643b0a64e5e5856af2e9a.s1.eu.hivemq.cloud:8883'
const MQTT_USER   = process.env.MQTT_USER   || 'your-hivemq-username'
const MQTT_PASS   = process.env.MQTT_PASS   || 'your-hivemq-password'

//payload must be json format {sensor_id, zone_id, metric_type, value}
const TOPIC       = 'scemas/readings'
//endpoit for ingest and key
const INGEST_URL  = process.env.FRONTEND_URL  || 'http://localhost:3000'
const API_KEY     = process.env.SENSOR_API_KEY || 'generate-a-random-secret-here'

const client = mqtt.connect(BROKER_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: 'mqtts',
})
client.on('connect', () => {
  console.log('connected to HiveMQ')
  client.subscribe(TOPIC, (err) => {
    if (err) console.error('subscribe error:', err)
    else console.log(`subscribed to ${TOPIC} — waiting for messages...`)
  })
})

client.on('message', async (topic, message) => {
  let payload
  try {
    payload = JSON.parse(message.toString())
  } catch {
    console.error('invalid JSON on topic', topic, ':', message.toString())
    return
  }
  const { sensor_id, zone_id, metric_type, value } = payload
  if (!sensor_id || !zone_id || !metric_type || value === undefined) {
    console.error('missing fields in payload:', payload)
    return
  }

  try {
    const res = await fetch(`${INGEST_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ sensor_id, zone_id, metric_type, value }),
    })
    console.log(`forwarded [${metric_type}=${value}] → ${res.status}`)
  } catch (err) {
    console.error('ingest request failed:', err)
  }
})

client.on('error', (err) => {
  console.error('MQTT error:', err.message)
})
client.on('close', () => {
  console.log('disconnected from HiveMQ')
})
