<script setup lang="ts">
import type { Product } from '@interior/contracts'
import { formatDimensions, formatMoney } from '../../lib/format'
import FurnitureArt from '../FurnitureArt.vue'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
defineProps<{ selectedProduct: Product }>()
const emit = defineEmits<{ close: []; estimate: [product: Product] }>()
const dialog = useTemplateRef<HTMLElement>('dialog')
let previous: HTMLElement | null = null
onMounted(() => {
  previous = document.activeElement as HTMLElement
  dialog.value?.querySelector<HTMLElement>('button')?.focus()
})
onUnmounted(() => previous?.focus())
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
  if (event.key !== 'Tab') return
  const elements = [
    ...(dialog.value?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]') ?? []),
  ]
  const first = elements[0],
    last = elements.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="emit('close')">
    <section
      ref="dialog"
      @keydown="keydown"
      class="product-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedProduct.title"
    >
      <button class="dialog-close" aria-label="Закрыть" @click="emit('close')">×</button>
      <div class="dialog-art" :class="`tone-${selectedProduct.image_tone}`">
        <FurnitureArt :tone="selectedProduct.image_tone" :category="selectedProduct.category" />
      </div>
      <div class="dialog-copy">
        <span class="eyebrow">{{ selectedProduct.category_name }}</span>
        <h2>{{ selectedProduct.title }}</h2>
        <p>{{ selectedProduct.description }}</p>
        <div class="receipt-line">
          <span>Материал</span><b>{{ selectedProduct.material_name }}</b>
        </div>
        <div class="receipt-line">
          <span>Размеры</span
          ><b>{{
            formatDimensions(selectedProduct.width_cm, selectedProduct.height_cm, selectedProduct.depth_cm)
          }}</b>
        </div>
        <div class="receipt-line">
          <span>Ориентир в каталоге</span
          ><b>{{ formatMoney(selectedProduct.price_from) }} — {{ formatMoney(selectedProduct.price_to) }}</b>
        </div>
        <ul class="feature-list">
          <li v-for="feature in selectedProduct.features" :key="feature">{{ feature }}</li>
        </ul>
        <button class="button button-primary full-width" @click="emit('estimate', selectedProduct)">
          Рассчитать этот вариант ↗
        </button>
      </div>
    </section>
  </div>
</template>
