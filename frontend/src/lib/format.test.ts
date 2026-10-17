import { describe, expect, it } from 'vitest'
import { formatDimensions, formatMoney } from './format'

describe('форматирование каталога', () => {
  it('показывает рубли в русской локали', () => {
    expect(formatMoney(185000)).toContain('185')
    expect(formatMoney(185000)).toContain('₽')
  })
  it('собирает три размера изделия', () => {
    expect(formatDimensions(180, 220, 60)).toBe('180 × 220 × 60 см')
  })
})
