import { Pool } from 'pg'
import { attachDatabasePool } from '@vercel/functions'
import { ApiProblem } from './problems.js'

let pool: Pool | undefined
export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new ApiProblem(503, 'База данных временно недоступна.')
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    })
    pool.on('error', () => console.error('PostgreSQL idle connection failed'))
    attachDatabasePool(pool)
  }
  return pool
}
