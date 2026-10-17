import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import { estimateSchema, type Dimensions, type Estimate } from '@interior/contracts'
import { getJson } from '../lib/api'

export function useCalculator() {
  const selectedMaterial = shallowRef('oak-solid')
  const dimensions = ref<Dimensions>({ widthCm: 180, heightCm: 220, depthCm: 60 })
  const selectedServices = ref<string[]>([])
  const estimate = shallowRef<Estimate | null>(null)
  const estimateError = shallowRef('')
  const calculating = shallowRef(false)
  let version = 0
  let controller: AbortController | undefined
  function invalidate() {
    version++
    controller?.abort()
    estimate.value = null
    estimateError.value = ''
    calculating.value = false
  }
  watch([selectedMaterial, dimensions, selectedServices], invalidate, { deep: true, flush: 'sync' })
  async function calculate() {
    invalidate()
    const parsed = estimateSchema.safeParse({
      material: selectedMaterial.value,
      ...dimensions.value,
      services: selectedServices.value,
    })
    if (!parsed.success) {
      estimateError.value = 'Все размеры должны быть числами от 1 до 2000 см. Выберите материал.'
      return
    }
    const revision = version
    controller = new AbortController()
    calculating.value = true
    try {
      const result = await getJson<Estimate>('/api/v1/calculator/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      })
      if (revision === version) estimate.value = result
    } catch (reason) {
      if (revision === version)
        estimateError.value = reason instanceof Error ? reason.message : 'Не удалось рассчитать стоимость.'
    } finally {
      if (revision === version) calculating.value = false
    }
  }
  onScopeDispose(() => {
    version++
    controller?.abort()
  })
  return { selectedMaterial, dimensions, selectedServices, estimate, estimateError, calculating, calculate }
}
