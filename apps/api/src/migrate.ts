import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Pool } from 'pg'

export async function migrate(
  pool: Pool,
  directory = fileURLToPath(new URL('../migrations', import.meta.url)),
) {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock(1747294906)')
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    )
    const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
    const applied: string[] = []
    for (const name of files) {
      const check = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])
      if (check.rows.length) continue
      await client.query('BEGIN')
      try {
        await client.query(await readFile(join(directory, name), 'utf8'))
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name])
        await client.query('COMMIT')
        applied.push(name)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
    return applied
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(1747294906)')
    } finally {
      client.release()
    }
  }
}
