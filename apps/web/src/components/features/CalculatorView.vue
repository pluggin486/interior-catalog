<script setup lang="ts">
import type { Product, Material, Service, Estimate, Dimensions } from '@interior/contracts'
import { formatMoney } from '../../lib/format'
defineProps<{
  materials: Material[]
  services: Service[]
  activeProduct: Product | null
  estimate: Estimate | null
  estimateError: string
  calculating: boolean
}>()
const selectedMaterial = defineModel<string>('selectedMaterial', { required: true })
const dimensions = defineModel<Dimensions>('dimensions', { required: true })
const selectedServices = defineModel<string[]>('selectedServices', { required: true })
const emit = defineEmits<{ calculate: []; inquiry: [] }>()
function selectMaterial(slug: string) {
  selectedMaterial.value = slug
  emit('calculate')
}
</script>

<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">Предварительный расчёт</span>
      <h1>Соберите параметры проекта</h1>
      <p>
        Оценка рассчитана по площади фасада и демонстрационным тарифам. Итоговые условия уточняются отдельно.
      </p>
    </div>
    <span class="step-pill">01 / 03 · Материал и размеры</span>
  </section>
  <div class="calculator-layout">
    <section class="calculator-panel">
      <div class="field-block">
        <h2>Материал</h2>
        <div class="option-grid">
          <button
            v-for="material in materials"
            :key="material.slug"
            class="material-option"
            :class="{ active: selectedMaterial === material.slug }"
            @click="selectMaterial(material.slug)"
          >
            <span class="material-dot" :style="{ backgroundColor: material.color }" /><b>{{
              material.name
            }}</b
            ><span class="small-label">{{ formatMoney(material.price_per_m2) }} / м²</span>
          </button>
        </div>
      </div>
      <div class="field-block">
        <h2>Размеры, см</h2>
        <div class="dimension-fields">
          <label>Ширина<input v-model.number="dimensions.widthCm" type="number" min="1" max="2000" /></label
          ><label>Высота<input v-model.number="dimensions.heightCm" type="number" min="1" max="2000" /></label
          ><label
            >Глубина<input v-model.number="dimensions.depthCm" type="number" min="1" max="2000"
          /></label>
        </div>
      </div>
      <div class="field-block">
        <h2>Услуги</h2>
        <label v-for="service in services" :key="service.slug" class="service-choice"
          ><input
            v-model="selectedServices"
            type="checkbox"
            :value="service.slug"
            @change="emit('calculate')"
          /><span
            ><b>{{ service.name }}</b
            ><small>{{ service.description }}</small></span
          ><strong>{{ formatMoney(service.price) }}</strong></label
        >
      </div>
      <button class="button button-primary" @click="emit('calculate')">Обновить расчёт</button>
    </section>
    <aside class="estimate-panel">
      <span class="eyebrow">Ваш ориентир</span>
      <h2>Предварительная смета</h2>
      <p v-if="activeProduct" class="estimate-product">Для изделия: {{ activeProduct.title }}</p>
      <div v-if="estimate" class="estimate-lines">
        <div>
          <span>Площадь фасада</span><b>{{ estimate.areaM2.toFixed(2) }} м²</b>
        </div>
        <div>
          <span>Материал</span><b>{{ formatMoney(estimate.materialTotal) }}</b>
        </div>
        <div>
          <span>Услуги</span><b>{{ formatMoney(estimate.servicesTotal) }}</b>
        </div>
        <div class="estimate-total">
          <span>Предварительно</span><strong>{{ formatMoney(estimate.totalPrice) }}</strong>
        </div>
      </div>
      <p v-else-if="estimateError" class="notice-error" role="alert">{{ estimateError }}</p>
      <p v-else-if="calculating" role="status">Рассчитываем стоимость…</p>
      <p v-else class="small-label">Измените размеры или услуги, чтобы получить предварительную оценку.</p>
      <p class="fine-print">
        Демонстрационный ориентир не является публичной офертой или окончательной сметой.
      </p>
      <button class="button button-primary full-width" @click="emit('inquiry')">
        Передать параметры мастеру
      </button>
    </aside>
  </div>
</template>
