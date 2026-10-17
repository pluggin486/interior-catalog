import { setTimeout as delay } from 'node:timers/promises'

const url = new URL('/health/ready', process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5080')
const deadline = Date.now() + 30_000
let ready = false

console.log(`Waiting for API: ${url}`)
while (Date.now() < deadline) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
    const health = await response.json()
    if (response.ok && health.status === 'ready') {
      ready = true
      break
    }
  } catch {
    // The API may still be starting or connecting to PostgreSQL.
  }
  await delay(250)
}

if (!ready) throw new Error(`API did not become ready within 30 seconds: ${url}`)
console.log('API is ready. Starting the frontend.')
