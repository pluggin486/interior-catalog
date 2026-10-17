import { computed, onMounted, ref, shallowRef } from 'vue'
import type { Category, Material, Product, Service } from '@interior/contracts'
import { getJson } from '../lib/api'

export function useCatalog() {
  const products = ref<Product[]>([])
  const materials = ref<Material[]>([])
  const categories = ref<Category[]>([])
  const services = ref<Service[]>([])
  const loading = shallowRef(false)
  const error = shallowRef('')
  const search = shallowRef('')
  const categoryFilter = shallowRef('')
  const materialFilter = shallowRef('')
  const compared = ref(['oak-solid', 'mdf-enamel', 'natural-veneer'])
  const visibleProducts = computed(() =>
    products.value.filter((product) => {
      const text =
        `${product.title} ${product.description} ${product.category_name} ${product.material_name}`.toLocaleLowerCase(
          'ru-RU',
        )
      return (
        text.includes(search.value.trim().toLocaleLowerCase('ru-RU')) &&
        (!categoryFilter.value || product.category === categoryFilter.value) &&
        (!materialFilter.value || product.material === materialFilter.value)
      )
    }),
  )
  const comparedMaterials = computed(() =>
    materials.value.filter((material) => compared.value.includes(material.slug)),
  )
  async function loadCatalog() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const data = await Promise.all([
        getJson<Product[]>('/api/v1/catalog/products'),
        getJson<Material[]>('/api/v1/catalog/materials'),
        getJson<Category[]>('/api/v1/catalog/categories'),
        getJson<Service[]>('/api/v1/catalog/services'),
      ])
      ;[products.value, materials.value, categories.value, services.value] = data
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить каталог.'
    } finally {
      loading.value = false
    }
  }
  function toggleCompare(slug: string) {
    compared.value = compared.value.includes(slug)
      ? compared.value.filter((value) => value !== slug)
      : [...compared.value.slice(compared.value.length >= 3 ? 1 : 0), slug]
  }
  onMounted(loadCatalog)
  return {
    materials,
    categories,
    services,
    loading,
    error,
    search,
    categoryFilter,
    materialFilter,
    compared,
    visibleProducts,
    comparedMaterials,
    loadCatalog,
    toggleCompare,
  }
}
