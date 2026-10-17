import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import {
  inquirySchema,
  type Product,
  type Material,
  type Category,
  type Service,
  type Estimate,
  type EstimateRequest,
  type InquiryRequest,
  type InquiryResponse,
} from '@interior/contracts'
import { ApiProblem, invalid } from './problems.js'

const productColumns = `p.slug, p.title, p.description, c.slug AS category, c.name AS category_name,
  m.slug AS material, m.name AS material_name, m.color, p.price_from, p.price_to,
  p.width_cm, p.height_cm, p.depth_cm, p.image_tone, p.features`
const productTables = `FROM products p JOIN categories c ON c.id=p.category_id AND c.is_active
  JOIN materials m ON m.id=p.material_id AND m.is_active WHERE p.is_active`
const materialQuery =
  'SELECT slug, name, color, description, properties, price_per_m2, sort_order FROM materials WHERE is_active'
const serviceQuery = 'SELECT slug, name, description, price, sort_order FROM services WHERE is_active'

export class CatalogRepository {
  constructor(private database: () => Pool) {}
  async ready() {
    await this.database().query('SELECT 1')
  }

  private async list<T>(query: string, values: unknown[] = []): Promise<T[]> {
    const { rows } = await this.database().query(
      `SELECT coalesce(jsonb_agg(to_jsonb(item) - 'sort_order' ORDER BY item.sort_order, item.slug), '[]'::jsonb) AS value FROM (${query}) item`,
      values,
    )
    return rows[0].value as T[]
  }
  products(query: { q?: string; category?: string; material?: string }) {
    return this.list<Product>(
      `SELECT ${productColumns}, p.sort_order ${productTables}
      AND ($1::text IS NULL OR lower(concat_ws(' ', p.title, p.description, c.name, m.name)) LIKE '%' || lower($1::text) || '%')
      AND ($2::text IS NULL OR c.slug=$2) AND ($3::text IS NULL OR m.slug=$3)`,
      [query.q?.trim() ?? null, query.category ?? null, query.material ?? null],
    )
  }
  async product(slug: string): Promise<Product | null> {
    const { rows } = await this.database().query(
      `SELECT to_jsonb(item) AS value FROM (SELECT ${productColumns} ${productTables} AND p.slug=$1) item`,
      [slug],
    )
    return rows[0]?.value ?? null
  }
  materials() {
    return this.list<Material>(materialQuery)
  }
  categories() {
    return this.list<Category>('SELECT slug, name, sort_order FROM categories WHERE is_active')
  }
  services() {
    return this.list<Service>(serviceQuery)
  }
  async options() {
    const [materials, services] = await Promise.all([
      this.list<Pick<Material, 'slug' | 'name' | 'color' | 'price_per_m2'>>(
        'SELECT slug, name, color, price_per_m2, sort_order FROM materials WHERE is_active',
      ),
      this.list<Pick<Service, 'slug' | 'name' | 'price'>>(
        'SELECT slug, name, price, sort_order FROM services WHERE is_active',
      ),
    ])
    return { materials, services, isPreliminary: true }
  }
  async estimate(request: EstimateRequest): Promise<Estimate> {
    const { rows } = await this.database().query(
      `
      WITH chosen_material AS (SELECT price_per_m2 FROM materials WHERE slug=$1 AND is_active),
      chosen_services AS (SELECT price FROM services WHERE slug=ANY($4::text[]) AND is_active),
      totals AS (SELECT count(*) AS count, coalesce(sum(price),0) AS price FROM chosen_services),
      material_cost AS (SELECT $2::numeric*$3::numeric/10000 AS area,
        round($2::numeric*$3::numeric/10000*price_per_m2,2) AS price FROM chosen_material)
      SELECT jsonb_build_object('areaM2', m.area, 'materialTotal', m.price, 'servicesTotal', s.price,
        'totalPrice', round(m.price+s.price,2), 'isPreliminary', true) AS value,
        s.count::int AS count FROM material_cost m CROSS JOIN totals s`,
      [request.material, request.widthCm, request.heightCm, request.services],
    )
    if (!rows.length) invalid('material', 'Выберите доступный материал.')
    if (rows[0].count !== request.services.length) invalid('services', 'В запросе есть недоступная услуга.')
    return rows[0].value as Estimate
  }

  async inquiry(key: string, request: InquiryRequest): Promise<InquiryResponse> {
    const client = await this.database().connect()
    try {
      await client.query('BEGIN')
      // The lock and lookup share one transaction/connection, including behind PgBouncer.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key])
      const existing = await client.query(
        `SELECT request_id, created_at, source, contact_name, phone, email,
        product_slug, material_slug, dimensions, service_slugs, comment FROM inquiries WHERE idempotency_key=$1`,
        [key],
      )
      if (existing.rows.length) {
        const row = existing.rows[0]
        const previous = inquirySchema.safeParse({
          source: row.source,
          name: row.contact_name,
          phone: row.phone,
          email: row.email,
          productSlug: row.product_slug,
          materialSlug: row.material_slug,
          dimensions: row.dimensions,
          services: row.service_slugs,
          comment: row.comment,
        })
        if (!previous.success || JSON.stringify(previous.data) !== JSON.stringify(request))
          throw new ApiProblem(409, 'Этот ключ уже использован для другого обращения.')
        await client.query('COMMIT')
        return { requestId: row.request_id, createdAt: row.created_at.toISOString() }
      }
      await this.validateReferences(client, request)
      const { rows } = await client.query(
        `INSERT INTO inquiries
        (request_id,idempotency_key,source,contact_name,phone,email,product_slug,material_slug,dimensions,service_slugs,comment)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::text[],$11) RETURNING request_id,created_at`,
        [
          randomUUID(),
          key,
          request.source,
          request.name,
          request.phone,
          request.email,
          request.productSlug,
          request.materialSlug,
          JSON.stringify(request.dimensions),
          request.services,
          request.comment,
        ],
      )
      await client.query('COMMIT')
      return { requestId: rows[0].request_id, createdAt: rows[0].created_at.toISOString() }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  private async validateReferences(client: PoolClient, request: InquiryRequest) {
    if (request.productSlug) {
      const result = await client.query(
        `SELECT p.id ${productTables} AND p.slug=$1 FOR KEY SHARE OF p, c, m`,
        [request.productSlug],
      )
      if (!result.rows.length) invalid('productSlug', 'Выберите доступное изделие.')
    }
    if (request.materialSlug) {
      const result = await client.query(
        'SELECT id FROM materials WHERE slug=$1 AND is_active FOR KEY SHARE',
        [request.materialSlug],
      )
      if (!result.rows.length) invalid('materialSlug', 'Выберите доступный материал.')
    }
    const result = await client.query(
      'SELECT slug FROM services WHERE slug=ANY($1::text[]) AND is_active FOR KEY SHARE',
      [request.services],
    )
    if (result.rows.length !== request.services.length)
      invalid('services', 'В запросе есть недоступная услуга.')
  }
}
