import { describe, expect, it } from 'vitest'
import { estimateSchema, inquirySchema } from './index.js'

const estimate = { material: 'oak-solid', widthCm: 180, heightCm: 220, depthCm: 60, services: [] }
describe('API contracts', () => {
  it.each([null, undefined, 0, -1, 2001, '180', Number.NaN, Infinity])(
    'rejects invalid dimensions: %s',
    (widthCm) => {
      expect(estimateSchema.safeParse({ ...estimate, widthCm }).success).toBe(false)
    },
  )
  it('requires all dimensions, including depth', () => {
    const { depthCm, ...missing } = estimate
    expect(depthCm).toBe(60)
    expect(estimateSchema.safeParse(missing).success).toBe(false)
  })
  it('accepts fractional dimensions and normalizes services', () => {
    expect(
      estimateSchema.parse({ ...estimate, widthCm: 1.25, services: ['design', 'delivery', 'design'] })
        .services,
    ).toEqual(['delivery', 'design'])
  })
  it('validates inquiry dimensions and contact fields', () => {
    const request = { name: 'Тест', phone: '+70000000000', dimensions: estimate }
    expect(inquirySchema.safeParse(request).success).toBe(true)
    expect(inquirySchema.safeParse({ ...request, email: 'invalid' }).success).toBe(false)
    expect(inquirySchema.safeParse({ ...request, dimensions: {} }).success).toBe(false)
  })
})
