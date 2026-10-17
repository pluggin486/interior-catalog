<script setup lang="ts">
import { computed } from 'vue'
import type { Product, Material, Category } from '@interior/contracts'
import { formatMoney } from '../../lib/format'
import FurnitureArt from '../FurnitureArt.vue'
import SelectField from '../SelectField.vue'
const props = defineProps<{
  visibleProducts: Product[]
  loading: boolean
  categories: Category[]
  materials: Material[]
  compared: string[]
  comparedMaterials: Material[]
}>()
const search = defineModel<string>('search', { required: true })
const categoryFilter = defineModel<string>('categoryFilter', { required: true })
const materialFilter = defineModel<string>('materialFilter', { required: true })
const categoryOptions = computed(() => [
  { value: '', label: 'Все категории' },
  ...props.categories.map((item) => ({ value: item.slug, label: item.name })),
])
const materialOptions = computed(() => [
  { value: '', label: 'Все материалы' },
  ...props.materials.map((item) => ({ value: item.slug, label: item.name })),
])
const emit = defineEmits<{
  toggleCompare: [slug: string]
  details: [product: Product]
  estimate: [product: Product]
  materials: []
}>()
function resetFilters() {
  search.value = ''
  categoryFilter.value = ''
  materialFilter.value = ''
}
</script>

<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">Подбор по задаче</span>
      <h1>Каталог мебели</h1>
      <p>Сравните решения по типу, материалу и диапазону стоимости.</p>
    </div>
    <button class="button button-plain" @click="emit('materials')">Сравнить материалы ↗</button>
  </section>
  <div class="catalog-tools">
    <label class="search-field">
      <span class="filter-label">Поиск по каталогу</span>
      <span class="search">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5" />
          <path d="m12.5 12.5 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input v-model="search" type="search" placeholder="Найти изделие или материал" />
      </span>
    </label>
    <SelectField v-model="categoryFilter" label="Тип изделия" :options="categoryOptions" position="down" />
    <SelectField v-model="materialFilter" label="Материал" :options="materialOptions" position="down" />
    <span class="result-count" role="status">Найдено: {{ visibleProducts.length }}</span>
  </div>
  <div v-if="visibleProducts.length" class="product-grid">
    <article v-for="product in visibleProducts" :key="product.slug" class="product-card">
      <button
        class="product-visual"
        :class="`tone-${product.image_tone}`"
        @click="emit('details', product)"
        :aria-label="`Подробнее: ${product.title}`"
      >
        <FurnitureArt :tone="product.image_tone" :category="product.category" />
      </button>
      <div class="product-info">
        <div class="product-meta">
          <span>{{ product.category_name }}</span
          ><button
            class="compare-toggle"
            :aria-pressed="compared.includes(product.material)"
            @click="emit('toggleCompare', product.material)"
          >
            {{ compared.includes(product.material) ? '✓ В сравнении' : '+ Сравнить' }}
          </button>
        </div>
        <h3>{{ product.title }}</h3>
        <p class="product-desc">{{ product.description }}</p>
        <div class="product-bottom">
          <div>
            <span class="small-label">От</span><b>{{ formatMoney(product.price_from) }}</b>
          </div>
          <span class="material-dot" :style="{ backgroundColor: product.color }" />{{ product.material_name }}
        </div>
        <button class="text-link" @click="emit('estimate', product)">
          Рассчитать вариант <span>↗</span>
        </button>
      </div>
    </article>
  </div>
  <div v-else-if="!loading" class="empty-state">
    <h2>Подходящих изделий нет</h2>
    <p>Измените фильтры или поисковый запрос.</p>
    <button class="button button-plain" @click="resetFilters">Сбросить фильтры</button>
  </div>
  <div v-if="comparedMaterials.length" class="compare-bar">
    <div>
      <b>Сравнение материалов</b><span>{{ comparedMaterials.map((item) => item.name).join(' · ') }}</span>
    </div>
    <button class="button button-primary" @click="emit('materials')">Открыть сравнение</button>
  </div>
</template>

<style scoped>
.catalog-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px 220px auto;
  align-items: end;
  gap: 14px;
}

.search-field {
  min-width: 0;
}

.filter-label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.search {
  height: 48px;
  border-radius: 10px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search:hover {
  border-color: #b39b84;
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgb(123 91 58 / 14%);
}

.search svg {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--muted);
}

.search input {
  min-width: 0;
  font-size: 14px;
}

.result-count {
  display: flex;
  align-items: center;
  min-height: 48px;
}

@media (max-width: 900px) {
  .catalog-tools {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .search-field {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .catalog-tools {
    grid-template-columns: minmax(0, 1fr);
  }

  .result-count {
    min-height: 0;
  }
}
</style>
