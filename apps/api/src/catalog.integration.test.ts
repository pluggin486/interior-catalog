import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { CatalogRepository } from './repository.js'
import { migrate } from './migrate.js'

if (
  !process.env.TEST_DATABASE_URL ||
  !new URL(process.env.TEST_DATABASE_URL).pathname.startsWith('/interior_test_')
)
  throw new Error('Use pnpm test:integration to create an isolated test database.')
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 8 })
const app = createApp(new CatalogRepository(() => pool))
const body = {
  source: 'calculator',
  name: 'Тест',
  phone: '+70000000000',
  email: null,
  productSlug: 'kitchen-linea',
  materialSlug: 'oak-solid',
  dimensions: { widthCm: 180, heightCm: 220, depthCm: 60 },
  services: ['design'],
  comment: null,
}
function post(path: string, data: unknown, key = crypto.randomUUID()) {
  return app.request('/api/v1' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(data),
  })
}
beforeAll(async () => {
  const second = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
  try {
    const results = await Promise.all([migrate(pool), migrate(second)])
    expect(results.flat()).toEqual(['001_interior_catalog.sql'])
  } finally {
    await second.end()
  }
})
afterAll(() => pool.end())
describe('PostgreSQL API and migrations', () => {
  it('serves every catalog route and preserves numeric JSON prices', async () => {
    expect((await app.request('/health/ready')).status).toBe(200)
    for (const [route, count] of [
      ['products', 12],
      ['materials', 4],
      ['categories', 4],
      ['services', 4],
    ] as const) {
      const response = await app.request('/api/v1/catalog/' + route)
      expect(response.status).toBe(200)
      expect(await response.json()).toHaveLength(count)
    }
    const product = await (await app.request('/api/v1/catalog/products/kitchen-linea')).json()
    expect(product.price_from).toBe(185000)
    expect(product).not.toHaveProperty('sort_order')
    const options = await (await app.request('/api/v1/calculator/options')).json()
    expect(options.materials[0].price_per_m2).toBe(68000)
    expect(options.services[0].price).toBe(4500)
    expect(options.isPreliminary).toBe(true)
  })
  it('filters products and returns a missing product as 404', async () => {
    const products = await (
      await app.request(
        '/api/v1/catalog/products?category=kitchens&material=mdf-enamel&q=' + encodeURIComponent('Линия'),
      )
    ).json()
    expect(products.map((p: { slug: string }) => p.slug)).toEqual(['kitchen-linea'])
    expect(await (await app.request('/api/v1/catalog/products?q=missing')).json()).toEqual([])
    expect((await app.request('/api/v1/catalog/products/missing')).status).toBe(404)
  })
  it('calculates exactly in numeric and deduplicates services', async () => {
    const response = await post('/calculator/estimate', {
      material: 'oak-solid',
      ...body.dimensions,
      services: ['design', 'design', 'delivery'],
    })
    expect(await response.json()).toEqual({
      areaM2: 3.96,
      materialTotal: 269280,
      servicesTotal: 19000,
      totalPrice: 288280,
      isPreliminary: true,
    })
    const fraction = await post('/calculator/estimate', {
      material: 'oak-solid',
      widthCm: 1.005,
      heightCm: 1,
      depthCm: 1,
    })
    expect((await fraction.json()).materialTotal).toBe(6.83)
  })
  it('rejects missing and inactive references consistently', async () => {
    for (const input of [
      { ...body, productSlug: 'missing' },
      { ...body, materialSlug: 'missing' },
      { ...body, services: ['missing'] },
    ])
      expect((await post('/inquiries', input)).status).toBe(400)
    expect((await post('/calculator/estimate', { ...body.dimensions, material: 'missing' })).status).toBe(400)
    expect(
      (
        await post('/calculator/estimate', {
          ...body.dimensions,
          material: 'oak-solid',
          services: ['missing'],
        })
      ).status,
    ).toBe(400)
    await pool.query("UPDATE materials SET is_active=false WHERE slug='oak-solid'")
    try {
      expect((await post('/inquiries', body)).status).toBe(400)
      expect((await post('/calculator/estimate', { ...body.dimensions, material: 'oak-solid' })).status).toBe(
        400,
      )
      expect((await app.request('/api/v1/catalog/products/table-forma')).status).toBe(404)
    } finally {
      await pool.query("UPDATE materials SET is_active=true WHERE slug='oak-solid'")
    }
  })
  it('creates one inquiry for concurrent identical requests and detects key conflicts', async () => {
    const key = crypto.randomUUID()
    const responses = await Promise.all(Array.from({ length: 6 }, () => post('/inquiries', body, key)))
    expect(responses.map((response) => response.status)).toEqual(Array(6).fill(201))
    const results = await Promise.all(responses.map((response) => response.json()))
    expect(new Set(results.map((result) => result.requestId)).size).toBe(1)
    expect(results[0].createdAt).toMatch(/Z$/)
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM inquiries WHERE idempotency_key=$1', [key]))
        .rows[0].count,
    ).toBe(1)
    expect((await post('/inquiries', { ...body, name: 'Другой тест' }, key)).status).toBe(409)
  })
  it('does not reapply an already initialized .NET migration or remove inquiries', async () => {
    const count = (await pool.query('SELECT count(*) FROM inquiries')).rows[0].count
    expect(await migrate(pool)).toEqual([])
    expect((await pool.query('SELECT count(*) FROM inquiries')).rows[0].count).toBe(count)
  })
  it('rolls back a failed migration and its journal entry', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'interior-migrations-'))
    try {
      await writeFile(
        join(directory, '002_broken.sql'),
        'CREATE TABLE rollback_probe(id int); SELECT definitely_missing_column;',
      )
      await expect(migrate(pool, directory)).rejects.toThrow()
      expect((await pool.query("SELECT to_regclass('rollback_probe') AS name")).rows[0].name).toBeNull()
      expect(
        (await pool.query("SELECT 1 FROM schema_migrations WHERE name='002_broken.sql'")).rows,
      ).toHaveLength(0)
    } finally {
      await rm(directory, { recursive: true })
    }
  })
})
