<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { formatDimensions, formatMoney } from './lib/format'
import FurnitureArt from './components/FurnitureArt.vue'

type Screen = 'home' | 'catalog' | 'materials' | 'calculator' | 'inquiry'
interface Product { slug: string; title: string; description: string; category: string; category_name: string; material: string; material_name: string; color: string; price_from: number; price_to: number; width_cm: number; height_cm: number; depth_cm: number; image_tone: string; features: string[] }
interface Material { slug: string; name: string; color: string; description: string; properties: Record<string, string>; price_per_m2: number }
interface Category { slug: string; name: string }
interface Service { slug: string; name: string; description: string; price: number }
interface Estimate { areaM2: number; materialTotal: number; servicesTotal: number; totalPrice: number; isPreliminary: boolean }

const screen = ref<Screen>('home')
const products = ref<Product[]>([])
const materials = ref<Material[]>([])
const categories = ref<Category[]>([])
const services = ref<Service[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const categoryFilter = ref('')
const materialFilter = ref('')
const compared = ref<string[]>(['oak-solid', 'mdf-enamel', 'natural-veneer'])
const selectedMaterial = ref('oak-solid')
const selectedProduct = ref<Product | null>(null)
const estimate = ref<Estimate | null>(null)
const estimateError = ref('')
const dimensions = reactive({ widthCm: 180, heightCm: 220, depthCm: 60 })
const selectedServices = ref<string[]>([])
const inquirySource = ref<'catalog' | 'calculator' | 'comparison'>('catalog')
const inquiry = reactive({ name: '', phone: '', email: '', comment: '' })
const inquiryMessage = ref('')
const inquiryError = ref('')

const visibleProducts = computed(() => products.value.filter((product) => {
  const text = `${product.title} ${product.description} ${product.category_name} ${product.material_name}`.toLocaleLowerCase('ru-RU')
  return (!search.value || text.includes(search.value.trim().toLocaleLowerCase('ru-RU')))
    && (!categoryFilter.value || product.category === categoryFilter.value)
    && (!materialFilter.value || product.material === materialFilter.value)
}))
const comparedMaterials = computed(() => materials.value.filter(material => compared.value.includes(material.slug)))
const activeProduct = computed(() => selectedProduct.value)

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null
    throw new Error(problem?.detail ?? problem?.title ?? 'Не удалось выполнить запрос. Повторите попытку.')
  }
  return await response.json() as T
}

async function loadCatalog() {
  loading.value = true
  error.value = ''
  try {
    const [productData, materialData, categoryData, serviceData] = await Promise.all([
      getJson<Product[]>('/api/v1/catalog/products'),
      getJson<Material[]>('/api/v1/catalog/materials'),
      getJson<Category[]>('/api/v1/catalog/categories'),
      getJson<Service[]>('/api/v1/catalog/services'),
    ])
    products.value = productData
    materials.value = materialData
    categories.value = categoryData
    services.value = serviceData
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить каталог.'
  } finally { loading.value = false }
}

function navigate(next: Screen) {
  screen.value = next
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function toggleCompare(slug: string) {
  compared.value = compared.value.includes(slug)
    ? compared.value.filter(item => item !== slug)
    : compared.value.length < 3 ? [...compared.value, slug] : [...compared.value.slice(1), slug]
}
function startEstimate(materialSlug = selectedMaterial.value, source: 'catalog' | 'comparison' = 'comparison') {
  inquirySource.value = source
  selectedMaterial.value = materialSlug
  estimate.value = null
  estimateError.value = ''
  navigate('calculator')
  void calculate()
}
async function calculate() {
  estimate.value = null
  estimateError.value = ''
  try {
    estimate.value = await getJson<Estimate>('/api/v1/calculator/estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: selectedMaterial.value, ...dimensions, services: selectedServices.value }),
    })
  } catch (reason) { estimateError.value = reason instanceof Error ? reason.message : 'Не удалось рассчитать стоимость.' }
}
function chooseProduct(product: Product) {
  selectedProduct.value = product
  selectedMaterial.value = product.material
  dimensions.widthCm = product.width_cm
  dimensions.heightCm = product.height_cm
  dimensions.depthCm = product.depth_cm
}
async function submitInquiry() {
  inquiryError.value = ''
  inquiryMessage.value = ''
  try {
    const response = await getJson<{ requestId: string }>('/api/v1/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        source: inquirySource.value,
        name: inquiry.name, phone: inquiry.phone, email: inquiry.email || null,
        productSlug: selectedProduct.value?.slug ?? null, materialSlug: selectedMaterial.value,
        dimensions: { widthCm: dimensions.widthCm, heightCm: dimensions.heightCm, depthCm: dimensions.depthCm },
        services: selectedServices.value, comment: inquiry.comment || null,
      }),
    })
    inquiryMessage.value = `Обращение ${response.requestId.slice(0, 8)} сохранено в демонстрационной базе.`
    inquiry.name = ''; inquiry.phone = ''; inquiry.email = ''; inquiry.comment = ''
  } catch (reason) { inquiryError.value = reason instanceof Error ? reason.message : 'Не удалось сохранить обращение.' }
}
onMounted(loadCatalog)
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
        <button :aria-current="screen === 'catalog' ? 'page' : undefined" @click="navigate('catalog')">Каталог</button>
        <button :aria-current="screen === 'materials' ? 'page' : undefined" @click="navigate('materials')">Материалы</button>
        <button :aria-current="screen === 'calculator' ? 'page' : undefined" @click="navigate('calculator')">Расчёт</button>
      </nav>
      <button class="button button-dark header-cta" @click="inquirySource = 'catalog'; navigate('inquiry')">Обсудить проект</button>
    </div>
  </header>

  <main id="main" class="shell main-content" tabindex="-1">
    <div v-if="error" class="notice notice-error" role="alert">{{ error }} <button class="text-button" @click="loadCatalog">Повторить</button></div>
    <div v-if="loading" class="loading" role="status">Загружаем каталог…</div>

    <template v-if="screen === 'home'">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Мебель по вашему пространству</span>
          <h1>Сравните материалы.<br><em>Найдите свой вариант.</em></h1>
          <p>Каталог продуманных решений для дома. Выберите изделие, сравните отделки и соберите предварительную смету.</p>
          <div class="actions"><button class="button button-primary" @click="navigate('catalog')">Смотреть каталог <span aria-hidden="true">↗</span></button><button class="button button-plain" @click="navigate('materials')">Сравнить материалы</button></div>
          <div class="hero-note"><span class="note-dot" /> Демонстрационный каталог · 12 решений для интерьера</div>
        </div>
        <div class="hero-art" aria-label="Схематичное изображение мебели и интерьера" role="img">
          <div class="art-window"><span /><span /><span /></div><div class="art-cabinet"><div class="cabinet-top"/><div class="cabinet-body"><span/><span/><span/></div></div><div class="art-table"><span/><i/></div><div class="art-vase"/><div class="art-plant"><i/><i/><i/><b/></div><div class="art-caption">Тактильные материалы<br>и точная геометрия</div>
        </div>
      </section>
      <section class="section intro-row">
        <div><span class="eyebrow">Как устроен выбор</span><h2>От идеи — к понятному плану</h2></div>
        <p class="section-copy">Сопоставьте свойства материалов, выберите подходящие услуги и передайте мастеру уже собранный контекст.</p>
      </section>
      <section class="feature-grid">
        <button class="feature-card" @click="navigate('catalog')"><span class="feature-number">01</span><h3>Изучите изделия</h3><p>Сравните размеры, диапазоны стоимости и варианты отделки.</p><span class="feature-link">Открыть каталог <b>↗</b></span></button>
        <button class="feature-card" @click="navigate('materials')"><span class="feature-number">02</span><h3>Сравните материалы</h3><p>Посмотрите свойства и выберите основу для вашего проекта.</p><span class="feature-link">К материалам <b>↗</b></span></button>
        <button class="feature-card" @click="navigate('calculator')"><span class="feature-number">03</span><h3>Соберите расчёт</h3><p>Введите размеры и добавьте нужные услуги к проекту.</p><span class="feature-link">Начать расчёт <b>↗</b></span></button>
      </section>
      <section class="demo-note">Цены, характеристики и тарифы в этой версии приведены только для демонстрации интерфейса.</section>
    </template>

    <template v-else-if="screen === 'catalog'">
      <section class="page-head"><div><span class="eyebrow">Подбор по задаче</span><h1>Каталог мебели</h1><p>Сравните решения по типу, материалу и диапазону стоимости.</p></div><button class="button button-plain" @click="navigate('materials')">Сравнить материалы ↗</button></section>
      <div class="catalog-tools"><label class="search"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Найти изделие или материал" aria-label="Поиск по каталогу"></label><select v-model="categoryFilter" aria-label="Тип изделия"><option value="">Все категории</option><option v-for="item in categories" :key="item.slug" :value="item.slug">{{ item.name }}</option></select><select v-model="materialFilter" aria-label="Материал"><option value="">Все материалы</option><option v-for="item in materials" :key="item.slug" :value="item.slug">{{ item.name }}</option></select><span class="result-count">{{ visibleProducts.length }} вариантов</span></div>
      <div v-if="visibleProducts.length" class="product-grid">
        <article v-for="product in visibleProducts" :key="product.slug" class="product-card">
          <button class="product-visual" :class="`tone-${product.image_tone}`" @click="chooseProduct(product); navigate('catalog')" :aria-label="`Подробнее: ${product.title}`"><FurnitureArt :tone="product.image_tone" :category="product.category" /></button>
          <div class="product-info"><div class="product-meta"><span>{{ product.category_name }}</span><button class="compare-toggle" :aria-pressed="compared.includes(product.material)" @click="toggleCompare(product.material)">{{ compared.includes(product.material) ? '✓ В сравнении' : '+ Сравнить' }}</button></div><h3>{{ product.title }}</h3><p class="product-desc">{{ product.description }}</p><div class="product-bottom"><div><span class="small-label">От</span><b>{{ formatMoney(product.price_from) }}</b></div><span class="material-dot" :style="{ backgroundColor: product.color }" />{{ product.material_name }}</div><button class="text-link" @click="chooseProduct(product); startEstimate(product.material, 'catalog')">Рассчитать вариант <span>↗</span></button></div>
        </article>
      </div>
      <div v-else-if="!loading" class="empty-state"><h2>Подходящих изделий нет</h2><p>Измените фильтры или поисковый запрос.</p><button class="button button-plain" @click="search = ''; categoryFilter = ''; materialFilter = ''">Сбросить фильтры</button></div>
      <div v-if="comparedMaterials.length" class="compare-bar"><div><b>Сравнение материалов</b><span>{{ comparedMaterials.map(item => item.name).join(' · ') }}</span></div><button class="button button-dark" @click="navigate('materials')">Открыть сравнение</button></div>
    </template>

    <template v-else-if="screen === 'materials'">
      <section class="page-head"><div><span class="eyebrow">Текстура и свойства</span><h1>Сравните материалы</h1><p>Свойства помогают сузить выбор. Итоговый образец и отделку можно обсудить со специалистом.</p></div><button class="button button-primary" @click="startEstimate()">Перейти к расчёту ↗</button></section>
      <div class="material-cards"><article v-for="material in materials" :key="material.slug" class="material-card" :class="{ selected: compared.includes(material.slug) }"><button class="material-swatch" :style="{ '--swatch': material.color }" @click="toggleCompare(material.slug)" :aria-pressed="compared.includes(material.slug)"><span class="swatch-grain"/><span class="swatch-check">{{ compared.includes(material.slug) ? '✓' : '+' }}</span></button><div class="material-details"><div class="product-meta"><span>Материал</span><button class="text-link" @click="toggleCompare(material.slug)">{{ compared.includes(material.slug) ? 'Убрать' : 'Сравнить' }}</button></div><h3>{{ material.name }}</h3><p>{{ material.description }}</p><div class="material-facts"><div v-for="(value, key) in material.properties" :key="key"><span>{{ key }}</span><b>{{ value }}</b></div></div><button class="text-link" @click="startEstimate(material.slug)">Выбрать материал <span>↗</span></button></div></article></div>
      <section class="comparison-panel"><div class="comparison-heading"><div><span class="eyebrow">В одном взгляде</span><h2>Сопоставьте важное</h2></div><span class="small-label">Выбрано: {{ comparedMaterials.length }} из {{ materials.length }}</span></div><div class="comparison-table" role="table" aria-label="Сравнение материалов"><div class="comparison-row comparison-row-head" role="row"><div role="columnheader">Критерий</div><div v-for="item in comparedMaterials" :key="item.slug" role="columnheader">{{ item.name }}</div></div><div class="comparison-row" role="row"><div role="rowheader">Стоимость материала, за м²</div><div v-for="item in comparedMaterials" :key="item.slug">{{ formatMoney(item.price_per_m2) }}</div></div><div class="comparison-row" role="row"><div role="rowheader">Цветовая гамма</div><div v-for="item in comparedMaterials" :key="item.slug"><span class="material-dot" :style="{ backgroundColor: item.color }" />{{ item.name }}</div></div><div class="comparison-row" role="row"><div role="rowheader">Отделка</div><div v-for="item in comparedMaterials" :key="item.slug">{{ item.properties['Отделка'] }}</div></div><div class="comparison-row comparison-action-row" role="row"><div role="rowheader">Действие</div><div v-for="item in comparedMaterials" :key="item.slug"><button class="text-link" @click="startEstimate(item.slug)">Выбрать материал ↗</button></div></div></div><p v-if="!comparedMaterials.length" class="small-label">Выберите материалы выше, чтобы сравнить их параметры.</p></section>
    </template>

    <template v-else-if="screen === 'calculator'">
      <section class="page-head"><div><span class="eyebrow">Предварительный расчёт</span><h1>Соберите параметры проекта</h1><p>Оценка рассчитана по площади фасада и демонстрационным тарифам. Итоговые условия уточняются отдельно.</p></div><span class="step-pill">01 / 03 · Материал и размеры</span></section>
      <div class="calculator-layout"><section class="calculator-panel"><div class="field-block"><h2>Материал</h2><div class="option-grid"><button v-for="material in materials" :key="material.slug" class="material-option" :class="{ active: selectedMaterial === material.slug }" @click="selectedMaterial = material.slug; calculate()"><span class="material-dot" :style="{ backgroundColor: material.color }"/><b>{{ material.name }}</b><span class="small-label">{{ formatMoney(material.price_per_m2) }} / м²</span></button></div></div><div class="field-block"><h2>Размеры, см</h2><div class="dimension-fields"><label>Ширина<input v-model.number="dimensions.widthCm" type="number" min="1" max="2000" /></label><label>Высота<input v-model.number="dimensions.heightCm" type="number" min="1" max="2000" /></label><label>Глубина<input v-model.number="dimensions.depthCm" type="number" min="1" max="2000" /></label></div></div><div class="field-block"><h2>Услуги</h2><label v-for="service in services" :key="service.slug" class="service-choice"><input v-model="selectedServices" type="checkbox" :value="service.slug" @change="calculate"/><span><b>{{ service.name }}</b><small>{{ service.description }}</small></span><strong>{{ formatMoney(service.price) }}</strong></label></div><button class="button button-primary" @click="calculate">Обновить расчёт</button></section><aside class="estimate-panel"><span class="eyebrow">Ваш ориентир</span><h2>Предварительная смета</h2><p v-if="activeProduct" class="estimate-product">Для изделия: {{ activeProduct.title }}</p><div v-if="estimate" class="estimate-lines"><div><span>Площадь фасада</span><b>{{ estimate.areaM2.toFixed(2) }} м²</b></div><div><span>Материал</span><b>{{ formatMoney(estimate.materialTotal) }}</b></div><div><span>Услуги</span><b>{{ formatMoney(estimate.servicesTotal) }}</b></div><div class="estimate-total"><span>Предварительно</span><strong>{{ formatMoney(estimate.totalPrice) }}</strong></div></div><p v-else-if="estimateError" class="notice-error" role="alert">{{ estimateError }}</p><p v-else class="small-label">Измените размеры или услуги, чтобы получить предварительную оценку.</p><p class="fine-print">Демонстрационный ориентир не является публичной офертой или окончательной сметой.</p><button class="button button-dark full-width" @click="inquirySource = 'calculator'; navigate('inquiry')">Передать параметры мастеру</button></aside></div>
    </template>

    <template v-else>
      <section class="page-head"><div><span class="eyebrow">Обращение</span><h1>Обсудить ваш проект</h1><p>Передайте параметры изделия и удобный способ связи. Данные сохраняются в локальной демонстрационной базе.</p></div></section>
      <div class="inquiry-layout"><form class="inquiry-form" @submit.prevent="submitInquiry"><label>Имя<input v-model.trim="inquiry.name" autocomplete="name" required minlength="2" maxlength="120" /></label><label>Телефон<input v-model.trim="inquiry.phone" autocomplete="tel" type="tel" required minlength="7" maxlength="40" placeholder="+7 (___) ___-__-__" /></label><label>Email, необязательно<input v-model.trim="inquiry.email" autocomplete="email" type="email" maxlength="200" /></label><label>Комментарий<textarea v-model.trim="inquiry.comment" rows="4" maxlength="2000" placeholder="Опишите задачу и важные ограничения" /></label><div class="demo-consent">Демонстрационный режим: используйте только тестовые контактные данные.</div><p v-if="inquiryError" class="notice-error" role="alert">{{ inquiryError }}</p><p v-if="inquiryMessage" class="notice-success" role="status">{{ inquiryMessage }}</p><button class="button button-primary" type="submit">Сохранить обращение</button></form><aside class="receipt"><span class="eyebrow">Контекст обращения</span><h2>Параметры проекта</h2><div v-if="activeProduct" class="receipt-line"><span>Изделие</span><b>{{ activeProduct.title }}</b></div><div class="receipt-line"><span>Материал</span><b>{{ materials.find(item => item.slug === selectedMaterial)?.name ?? 'Не выбран' }}</b></div><div class="receipt-line"><span>Размеры</span><b>{{ formatDimensions(dimensions.widthCm, dimensions.heightCm, dimensions.depthCm) }}</b></div><div class="receipt-line"><span>Услуги</span><b>{{ selectedServices.map(slug => services.find(item => item.slug === slug)?.name).filter(Boolean).join(', ') || 'Не выбраны' }}</b></div><div class="receipt-line"><span>Оценка</span><b>{{ estimate ? formatMoney(estimate.totalPrice) : 'Не рассчитана' }}</b></div><button class="text-link" @click="navigate('calculator')">Изменить параметры ↗</button></aside></div>
    </template>

    <div v-if="selectedProduct && screen === 'catalog'" class="modal-backdrop" role="presentation" @click.self="selectedProduct = null">
      <section class="product-dialog" role="dialog" aria-modal="true" :aria-label="selectedProduct.title">
        <button class="dialog-close" aria-label="Закрыть" @click="selectedProduct = null">×</button>
        <div class="dialog-art" :class="`tone-${selectedProduct.image_tone}`"><FurnitureArt :tone="selectedProduct.image_tone" :category="selectedProduct.category" /></div>
        <div class="dialog-copy"><span class="eyebrow">{{ selectedProduct.category_name }}</span><h2>{{ selectedProduct.title }}</h2><p>{{ selectedProduct.description }}</p><div class="receipt-line"><span>Материал</span><b>{{ selectedProduct.material_name }}</b></div><div class="receipt-line"><span>Размеры</span><b>{{ formatDimensions(selectedProduct.width_cm, selectedProduct.height_cm, selectedProduct.depth_cm) }}</b></div><div class="receipt-line"><span>Ориентир в каталоге</span><b>{{ formatMoney(selectedProduct.price_from) }} — {{ formatMoney(selectedProduct.price_to) }}</b></div><ul class="feature-list"><li v-for="feature in selectedProduct.features" :key="feature">{{ feature }}</li></ul><button class="button button-primary full-width" @click="startEstimate(selectedProduct.material, 'catalog')">Рассчитать этот вариант ↗</button></div>
      </section>
    </div>
  </main>

  <footer class="footer"><div class="shell footer-row"><div><b>Интерьерная мастерская</b><p>Демонстрационный проект каталога мебели и интерьеров</p></div><div class="footer-note">Все товары, цены и характеристики вымышлены и показаны для демонстрации.</div><button class="text-link" @click="inquirySource = 'catalog'; navigate('inquiry')">Обсудить проект ↗</button></div></footer>
</template>

