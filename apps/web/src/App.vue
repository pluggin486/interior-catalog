<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import type { Product, InquirySource } from '@interior/contracts'
import { useCatalog } from './composables/useCatalog'
import { useCalculator } from './composables/useCalculator'
import { useInquiry } from './composables/useInquiry'
import HomeView from './components/features/HomeView.vue'
import CatalogView from './components/features/CatalogView.vue'
import MaterialsView from './components/features/MaterialsView.vue'
import CalculatorView from './components/features/CalculatorView.vue'
import InquiryView from './components/features/InquiryView.vue'
import ProductDialog from './components/features/ProductDialog.vue'

type Screen = 'home' | 'catalog' | 'materials' | 'calculator' | 'inquiry'
const screen = shallowRef<Screen>('home')
const selectedProduct = ref<Product | null>(null)
const dialogProduct = ref<Product | null>(null)
const inquirySource = shallowRef<InquirySource>('catalog')
const {
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
} = useCatalog()
const { selectedMaterial, dimensions, selectedServices, estimate, estimateError, calculating, calculate } =
  useCalculator()
const { inquiry, inquiryMessage, inquiryError, submitting, submitInquiry } = useInquiry(() => ({
  source: inquirySource.value,
  productSlug: selectedProduct.value?.slug ?? null,
  materialSlug: selectedMaterial.value,
  dimensions: { ...dimensions.value },
  services: [...selectedServices.value],
}))
function openInquiry(source: InquirySource) {
  inquirySource.value = source
  navigate('inquiry')
}
function navigate(next: Screen) {
  dialogProduct.value = null
  screen.value = next
  window.scrollTo({ top: 0, behavior: 'smooth' })
  if (next === 'calculator' && !estimate.value) void calculate()
}
function startEstimate(materialSlug = selectedMaterial.value) {
  selectedProduct.value = null
  selectedMaterial.value = materialSlug
  inquirySource.value = 'comparison'
  navigate('calculator')
}
function estimateProduct(product: Product) {
  selectedProduct.value = product
  selectedMaterial.value = product.material
  dimensions.value = { widthCm: product.width_cm, heightCm: product.height_cm, depthCm: product.depth_cm }
  inquirySource.value = 'catalog'
  navigate('calculator')
}
</script>

<template>
  <a class="skip" href="#main">Перейти к содержимому</a>
  <header class="header">
    <div class="shell header-row">
      <button class="brand" @click="navigate('home')" aria-label="На главную">
        <span class="brand-mark" aria-hidden="true"><span /></span>
        <span>Интерьерная мастерская</span>
      </button>
      <nav class="nav" aria-label="Основная навигация">
        <button :aria-current="screen === 'catalog' ? 'page' : undefined" @click="navigate('catalog')">
          Каталог
        </button>
        <button :aria-current="screen === 'materials' ? 'page' : undefined" @click="navigate('materials')">
          Материалы
        </button>
        <button :aria-current="screen === 'calculator' ? 'page' : undefined" @click="navigate('calculator')">
          Расчёт
        </button>
      </nav>
      <button class="button button-primary header-cta" @click="openInquiry('catalog')">
        Обсудить проект
      </button>
    </div>
  </header>

  <main id="main" class="shell main-content" tabindex="-1">
    <div v-if="error" class="notice notice-error" role="alert">
      {{ error }} <button class="text-button" @click="loadCatalog">Повторить</button>
    </div>
    <div v-if="loading" class="loading" role="status">Загружаем каталог…</div>

    <HomeView v-if="screen === 'home'" @navigate="navigate" />
    <CatalogView
      v-else-if="screen === 'catalog'"
      v-model:search="search"
      v-model:category-filter="categoryFilter"
      v-model:material-filter="materialFilter"
      :visible-products="visibleProducts"
      :loading="loading"
      :categories="categories"
      :materials="materials"
      :compared="compared"
      :compared-materials="comparedMaterials"
      @toggle-compare="toggleCompare"
      @details="dialogProduct = $event"
      @estimate="estimateProduct"
      @materials="navigate('materials')"
    />
    <MaterialsView
      v-else-if="screen === 'materials'"
      :materials="materials"
      :compared="compared"
      :compared-materials="comparedMaterials"
      @toggle-compare="toggleCompare"
      @estimate="startEstimate"
    />
    <CalculatorView
      v-else-if="screen === 'calculator'"
      v-model:selected-material="selectedMaterial"
      v-model:dimensions="dimensions"
      v-model:selected-services="selectedServices"
      :materials="materials"
      :services="services"
      :active-product="selectedProduct"
      :estimate="estimate"
      :estimate-error="estimateError"
      :calculating="calculating"
      @calculate="calculate"
      @inquiry="openInquiry('calculator')"
    />
    <InquiryView
      v-else
      v-model:inquiry="inquiry"
      :active-product="selectedProduct"
      :materials="materials"
      :selected-material="selectedMaterial"
      :dimensions="dimensions"
      :services="services"
      :selected-services="selectedServices"
      :estimate="estimate"
      :inquiry-error="inquiryError"
      :inquiry-message="inquiryMessage"
      :submitting="submitting"
      @submit="submitInquiry"
      @calculator="navigate('calculator')"
    />
    <ProductDialog
      v-if="dialogProduct && screen === 'catalog'"
      :selected-product="dialogProduct"
      @close="dialogProduct = null"
      @estimate="estimateProduct"
    />
  </main>

  <footer class="footer">
    <div class="shell footer-row">
      <div>
        <b>Интерьерная мастерская</b>
        <p>Демонстрационный проект каталога мебели и интерьеров</p>
      </div>
      <div class="footer-note">Все товары, цены и характеристики вымышлены и показаны для демонстрации.</div>
      <button class="text-link" @click="openInquiry('catalog')">Обсудить проект ↗</button>
    </div>
  </footer>
</template>
