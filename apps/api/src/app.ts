import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { estimateSchema, inquirySchema, idempotencyKeySchema } from '@interior/contracts'
import { CatalogRepository } from './repository.js'
import { getPool } from './db.js'
import { ApiProblem, invalid, problem } from './problems.js'

type Repository = Pick<
  CatalogRepository,
  | 'ready'
  | 'products'
  | 'product'
  | 'materials'
  | 'categories'
  | 'services'
  | 'options'
  | 'estimate'
  | 'inquiry'
>
export function createApp(repository: Repository = new CatalogRepository(getPool)) {
  const app = new Hono()
  app.use(
    '*',
    bodyLimit({
      maxSize: 32768,
      onError: (c) =>
        c.json(problem(413, 'Слишком большой запрос.'), 413, { 'Content-Type': 'application/problem+json' }),
    }),
  )
  app.onError((error, c) => {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      for (const issue of error.issues) (errors[issue.path.join('.') || 'body'] ??= []).push(issue.message)
      return c.json(problem(400, 'Проверьте данные запроса.', errors), 400, {
        'Content-Type': 'application/problem+json',
      })
    }
    if (error instanceof ApiProblem)
      return c.json(problem(error.status, error.message, error.errors), error.status, {
        'Content-Type': 'application/problem+json',
      })
    const code = String((error as Error & { code?: string }).code ?? '')
    if (code === '23503')
      return c.json(problem(400, 'Выбранные данные больше недоступны.'), 400, {
        'Content-Type': 'application/problem+json',
      })
    if (/^(08|57P|53300|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)/.test(code))
      return c.json(problem(503, 'База данных временно недоступна.'), 503, {
        'Content-Type': 'application/problem+json',
      })
    console.error('Unhandled API error', { name: error.name, code })
    return c.json(problem(500, 'Не удалось выполнить запрос.'), 500, {
      'Content-Type': 'application/problem+json',
    })
  })
  app.notFound((c) =>
    c.json(problem(404, 'Ресурс не найден.'), 404, { 'Content-Type': 'application/problem+json' }),
  )
  const ready = async () => {
    await repository.ready()
    return { status: 'ready', database: 'interior_demo' }
  }
  app.get('/health/ready', async (c) => c.json(await ready()))
  app.get('/api/health/ready', async (c) => c.json(await ready()))
  app.get('/api/v1/catalog/products', async (c) => c.json(await repository.products(c.req.query())))
  app.get('/api/v1/catalog/products/:slug', async (c) => {
    const product = await repository.product(c.req.param('slug'))
    return product
      ? c.json(product)
      : c.json(problem(404, 'Изделие не найдено.'), 404, { 'Content-Type': 'application/problem+json' })
  })
  app.get('/api/v1/catalog/materials', async (c) => c.json(await repository.materials()))
  app.get('/api/v1/catalog/categories', async (c) => c.json(await repository.categories()))
  app.get('/api/v1/catalog/services', async (c) => c.json(await repository.services()))
  app.get('/api/v1/calculator/options', async (c) => c.json(await repository.options()))
  async function json(request: Request): Promise<unknown> {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json'))
      throw new ApiProblem(400, 'Передайте JSON в теле запроса.')
    try {
      return await request.json()
    } catch {
      throw new ApiProblem(400, 'Некорректный JSON.')
    }
  }
  app.post('/api/v1/calculator/estimate', async (c) =>
    c.json(await repository.estimate(estimateSchema.parse(await json(c.req.raw)))),
  )
  app.post('/api/v1/inquiries', async (c) => {
    const key = idempotencyKeySchema.safeParse(c.req.header('Idempotency-Key'))
    if (!key.success) invalid('Idempotency-Key', 'Передайте ключ длиной от 1 до 128 символов.')
    const request = inquirySchema.parse(await json(c.req.raw))
    return c.json(await repository.inquiry(key.data, request), 201)
  })
  return app
}
export const app = createApp()
