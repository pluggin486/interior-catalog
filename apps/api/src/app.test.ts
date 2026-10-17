import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'
import { CatalogRepository } from './repository.js'
import type { Pool } from 'pg'

function setup() {
  const db = { query: vi.fn(), connect: vi.fn() } as unknown as Pool
  return { db, app: createApp(new CatalogRepository(() => db)) }
}
describe('HTTP validation and failures', () => {
  it('returns 400 for null dimensions before querying the database', async () => {
    const { app, db } = setup()
    const response = await app.request('/api/v1/calculator/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: 'oak-solid', widthCm: null, heightCm: 220, depthCm: 60 }),
    })
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/problem+json')
    expect((await response.json()).errors).toHaveProperty('widthCm')
    expect(db.query).not.toHaveBeenCalled()
  })
  it('returns 400 for malformed JSON', async () => {
    const { app } = setup()
    const response = await app.request('/api/v1/calculator/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    expect(response.status).toBe(400)
  })
  it('returns 413 for oversized request bodies', async () => {
    const { app } = setup()
    expect((await app.request('/api/v1/inquiries', { method: 'POST', body: 'x'.repeat(32769) })).status).toBe(
      413,
    )
  })
  it('returns 503 on a connection failure without leaking connection details', async () => {
    const { app, db } = setup()
    vi.mocked(db.query).mockRejectedValue(
      Object.assign(new Error('postgres://secret'), { code: 'ECONNREFUSED' }),
    )
    const response = await app.request('/health/ready')
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret')
  })
  it('does not turn unknown API routes into HTML', async () => {
    const { app } = setup()
    const response = await app.request('/api/v1/missing')
    expect(response.status).toBe(404)
    expect((await response.json()).status).toBe(404)
  })
})
