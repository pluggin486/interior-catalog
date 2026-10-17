import { z } from 'zod'

export interface Product {
  slug: string
  title: string
  description: string
  category: string
  category_name: string
  material: string
  material_name: string
  color: string
  price_from: number
  price_to: number
  width_cm: number
  height_cm: number
  depth_cm: number
  image_tone: string
  features: string[]
}
export interface Material {
  slug: string
  name: string
  color: string
  description: string
  properties: Record<string, string>
  price_per_m2: number
}
export interface Category {
  slug: string
  name: string
}
export interface Service {
  slug: string
  name: string
  description: string
  price: number
}
export interface Estimate {
  areaM2: number
  materialTotal: number
  servicesTotal: number
  totalPrice: number
  isPreliminary: boolean
}
export interface InquiryResponse {
  requestId: string
  createdAt: string
}
export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
}

const dimension = z
  .number()
  .min(1, 'Размер должен быть не меньше 1 см.')
  .max(2000, 'Размер не должен превышать 2000 см.')
export const dimensionsSchema = z.object({ widthCm: dimension, heightCm: dimension, depthCm: dimension })
const slug = z.string().trim().min(1).max(128)
const services = z
  .array(slug)
  .max(50)
  .nullish()
  .transform((value) => [...new Set(value ?? [])].sort())
export const estimateSchema = dimensionsSchema.extend({ material: slug, services })
export const inquirySchema = z.object({
  source: z.enum(['catalog', 'calculator', 'comparison']).default('catalog'),
  name: z.string().trim().min(2, 'Укажите имя длиной от 2 до 120 символов.').max(120),
  phone: z.string().trim().min(7, 'Укажите номер телефона.').max(40),
  email: z
    .string()
    .trim()
    .max(200)
    .email('Укажите корректный email.')
    .nullish()
    .transform((value) => value ?? null),
  productSlug: slug.nullish().transform((value) => value ?? null),
  materialSlug: slug.nullish().transform((value) => value ?? null),
  dimensions: dimensionsSchema,
  services,
  comment: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value ?? null),
})
export const idempotencyKeySchema = z.string().trim().min(1, 'Передайте Idempotency-Key.').max(128)
export type Dimensions = z.infer<typeof dimensionsSchema>
export type EstimateRequest = z.infer<typeof estimateSchema>
export type InquiryRequest = z.infer<typeof inquirySchema>
export type InquirySource = InquiryRequest['source']
