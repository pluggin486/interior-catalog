import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCalculator } from './useCalculator'
import { useInquiry } from './useInquiry'

const scopes: ReturnType<typeof effectScope>[] = []
function scoped<T>(factory: () => T): T {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(factory)!
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const result = (price: number) => ({
  areaM2: 3.96,
  materialTotal: price,
  servicesTotal: 0,
  totalPrice: price,
  isPreliminary: true,
})
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.unstubAllGlobals()
})
describe('calculator request state', () => {
  it('ignores an earlier response even when the transport does not respect abort', async () => {
    const first = deferred<Response>(),
      second = deferred<Response>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    vi.stubGlobal('fetch', fetch)
    const calculator = scoped(useCalculator)
    const older = calculator.calculate()
    calculator.dimensions.value.widthCm = 200
    const newer = calculator.calculate()
    second.resolve(Response.json(result(200)))
    await newer
    first.resolve(Response.json(result(180)))
    await older
    expect(calculator.estimate.value?.totalPrice).toBe(200)
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  })
  it('invalidates an existing estimate immediately when inputs change', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result(180))))
    const calculator = scoped(useCalculator)
    await calculator.calculate()
    calculator.selectedServices.value.push('design')
    expect(calculator.estimate.value).toBeNull()
  })
  it('does not query the API for empty or invalid dimensions', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const calculator = scoped(useCalculator)
    calculator.dimensions.value.widthCm = 0
    await calculator.calculate()
    expect(fetch).not.toHaveBeenCalled()
    expect(calculator.estimateError.value).toContain('2000')
  })
})
function inquiry() {
  const form = scoped(() =>
    useInquiry(() => ({
      source: 'calculator',
      productSlug: null,
      materialSlug: 'oak-solid',
      dimensions: { widthCm: 180, heightCm: 220, depthCm: 60 },
      services: [],
    })),
  )
  form.inquiry.value.name = 'Тест'
  form.inquiry.value.phone = '+70000000000'
  return form
}
describe('inquiry retries', () => {
  it('blocks double submission and keeps the same key and payload after a network failure', async () => {
    const pending = deferred<Response>()
    const fetch = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        Response.json({ requestId: '12345678-test', createdAt: '2026-10-17T00:00:00Z' }, { status: 201 }),
      )
    vi.stubGlobal('fetch', fetch)
    const form = inquiry()
    const first = form.submitInquiry()
    await form.submitInquiry()
    expect(fetch).toHaveBeenCalledTimes(1)
    pending.resolve(new Response(null, { status: 503 }))
    await first
    await form.submitInquiry()
    await form.submitInquiry()
    const options = fetch.mock.calls.map((call) => call[1])
    expect(new Set(options.map((option) => option.headers['Idempotency-Key'])).size).toBe(1)
    expect(new Set(options.map((option) => option.body)).size).toBe(1)
    expect(form.inquiryMessage.value).toContain('12345678')
    expect(form.inquiry.value.name).toBe('')
  })
  it('uses a new key for edited data and displays server field errors', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json({ title: 'Validation', errors: { phone: ['Проверьте телефон.'] } }, { status: 400 }),
        ),
      )
    vi.stubGlobal('fetch', fetch)
    const form = inquiry()
    await form.submitInquiry()
    expect(form.inquiryError.value).toBe('Проверьте телефон.')
    form.inquiry.value.name = 'Другой тест'
    await form.submitInquiry()
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).not.toBe(
      fetch.mock.calls[1][1].headers['Idempotency-Key'],
    )
  })
})
