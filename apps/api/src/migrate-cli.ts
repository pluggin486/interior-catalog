import { Pool } from 'pg'
import { migrate } from './migrate.js'
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!connectionString) throw new Error('Set DATABASE_URL_UNPOOLED or DATABASE_URL before running migrations.')
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 })
try {
  console.log('Applied migrations:', await migrate(pool))
} finally {
  await pool.end()
}
