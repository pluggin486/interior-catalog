import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Pool } from 'pg'
import { migrate } from '../apps/api/src/migrate.js'

if (!process.env.DATABASE_URL) throw new Error('Set the local DATABASE_URL in .env first.')
const localUrl = new URL(process.env.DATABASE_URL)
if (!['127.0.0.1', 'localhost'].includes(localUrl.hostname))
  throw new Error('The test harness only creates databases on localhost.')
const name = `interior_test_${randomBytes(8).toString('hex')}`
const adminUrl = new URL(localUrl)
adminUrl.pathname = '/postgres'
const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 })
localUrl.pathname = '/' + name
try {
  await admin.query(`CREATE DATABASE ${name}`)
  const e2e = process.argv[2] === 'e2e'
  if (e2e) {
    const pool = new Pool({ connectionString: localUrl.toString() })
    try {
      await migrate(pool)
    } finally {
      await pool.end()
    }
  }
  const child = spawn(
    'pnpm',
    e2e
      ? ['exec', 'playwright', 'test']
      : ['exec', 'nx', 'run', 'api:test-integration', '--output-style=static'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: localUrl.toString(),
        TEST_DATABASE_URL: localUrl.toString(),
        NX_DAEMON: 'false',
      },
    },
  )
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', reject)
  })
} finally {
  await admin.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
    [name],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${name}`)
  await admin.end()
}
