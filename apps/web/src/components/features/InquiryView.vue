<script setup lang="ts">
import type { Product, Material, Service, Estimate, Dimensions } from '@interior/contracts'
import { formatDimensions, formatMoney } from '../../lib/format'
import type { ContactFields } from '../../composables/useInquiry'
import PhoneInput from '../PhoneInput.vue'
defineProps<{
  activeProduct: Product | null
  materials: Material[]
  selectedMaterial: string
  dimensions: Dimensions
  services: Service[]
  selectedServices: string[]
  estimate: Estimate | null
  inquiryError: string
  inquiryMessage: string
  submitting: boolean
}>()
const inquiry = defineModel<ContactFields>('inquiry', { required: true })
const emit = defineEmits<{ submit: []; calculator: [] }>()
</script>

<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">Обращение</span>
      <h1>Обсудить ваш проект</h1>
      <p>Передайте параметры изделия и удобный способ связи. Данные сохраняются в демонстрационной базе.</p>
    </div>
  </section>
  <div class="inquiry-layout">
    <form class="inquiry-form" @submit.prevent="emit('submit')">
      <label
        >Имя<input
          v-model.trim="inquiry.name"
          :disabled="submitting"
          autocomplete="name"
          required
          minlength="2"
          maxlength="120" /></label
      ><label>Телефон<PhoneInput v-model="inquiry.phone" :disabled="submitting" /></label
      ><label
        >Email, необязательно<input
          v-model.trim="inquiry.email"
          :disabled="submitting"
          autocomplete="email"
          type="email"
          maxlength="200" /></label
      ><label
        >Комментарий<textarea
          :disabled="submitting"
          v-model.trim="inquiry.comment"
          rows="4"
          maxlength="2000"
          placeholder="Опишите задачу и важные ограничения"
        />
      </label>
      <div class="demo-consent">Демонстрационный режим: используйте только тестовые контактные данные.</div>
      <p v-if="inquiryError" class="notice-error" role="alert">{{ inquiryError }}</p>
      <p v-if="inquiryMessage" class="notice-success" role="status">{{ inquiryMessage }}</p>
      <button class="button button-primary" type="submit" :disabled="submitting">
        {{ submitting ? 'Сохраняем…' : 'Сохранить обращение' }}
      </button>
    </form>
    <aside class="receipt">
      <span class="eyebrow">Контекст обращения</span>
      <h2>Параметры проекта</h2>
      <div v-if="activeProduct" class="receipt-line">
        <span>Изделие</span><b>{{ activeProduct.title }}</b>
      </div>
      <div class="receipt-line">
        <span>Материал</span
        ><b>{{ materials.find((item) => item.slug === selectedMaterial)?.name ?? 'Не выбран' }}</b>
      </div>
      <div class="receipt-line">
        <span>Размеры</span
        ><b>{{ formatDimensions(dimensions.widthCm, dimensions.heightCm, dimensions.depthCm) }}</b>
      </div>
      <div class="receipt-line">
        <span>Услуги</span
        ><b>{{
          selectedServices
            .map((slug) => services.find((item) => item.slug === slug)?.name)
            .filter(Boolean)
            .join(', ') || 'Не выбраны'
        }}</b>
      </div>
      <div class="receipt-line">
        <span>Оценка</span><b>{{ estimate ? formatMoney(estimate.totalPrice) : 'Не рассчитана' }}</b>
      </div>
      <button class="text-link" @click="emit('calculator')">Изменить параметры ↗</button>
    </aside>
  </div>
</template>
