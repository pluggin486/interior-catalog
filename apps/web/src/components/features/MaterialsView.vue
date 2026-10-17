<script setup lang="ts">
import type { Material } from '@interior/contracts'
import { formatMoney } from '../../lib/format'
defineProps<{ materials: Material[]; compared: string[]; comparedMaterials: Material[] }>()
const emit = defineEmits<{ toggleCompare: [slug: string]; estimate: [slug?: string] }>()
</script>

<template>
  <section class="page-head">
    <div>
      <span class="eyebrow">Текстура и свойства</span>
      <h1>Сравните материалы</h1>
      <p>Свойства помогают сузить выбор. Итоговый образец и отделку можно обсудить со специалистом.</p>
    </div>
    <button class="button button-primary" @click="emit('estimate')">Перейти к расчёту ↗</button>
  </section>
  <div class="material-cards">
    <article
      v-for="material in materials"
      :key="material.slug"
      class="material-card"
      :class="{ selected: compared.includes(material.slug) }"
    >
      <button
        class="material-swatch"
        :style="{ '--swatch': material.color }"
        @click="emit('toggleCompare', material.slug)"
        :aria-pressed="compared.includes(material.slug)"
      >
        <span class="swatch-grain" /><span class="swatch-check">{{
          compared.includes(material.slug) ? '✓' : '+'
        }}</span>
      </button>
      <div class="material-details">
        <div class="product-meta">
          <span>Материал</span
          ><button class="text-link" @click="emit('toggleCompare', material.slug)">
            {{ compared.includes(material.slug) ? 'Убрать' : 'Сравнить' }}
          </button>
        </div>
        <h3>{{ material.name }}</h3>
        <p>{{ material.description }}</p>
        <div class="material-facts">
          <div v-for="(value, key) in material.properties" :key="key">
            <span>{{ key }}</span
            ><b>{{ value }}</b>
          </div>
        </div>
        <button class="text-link" @click="emit('estimate', material.slug)">
          Выбрать материал <span>↗</span>
        </button>
      </div>
    </article>
  </div>
  <section class="comparison-panel">
    <div class="comparison-heading">
      <div>
        <span class="eyebrow">В одном взгляде</span>
        <h2>Сопоставьте важное</h2>
      </div>
      <span class="small-label">Выбрано: {{ comparedMaterials.length }} из {{ materials.length }}</span>
    </div>
    <div class="comparison-table" role="table" aria-label="Сравнение материалов">
      <div class="comparison-row comparison-row-head" role="row">
        <div role="columnheader">Критерий</div>
        <div v-for="item in comparedMaterials" :key="item.slug" role="columnheader">{{ item.name }}</div>
      </div>
      <div class="comparison-row" role="row">
        <div role="rowheader">Стоимость материала, за м²</div>
        <div v-for="item in comparedMaterials" :key="item.slug">{{ formatMoney(item.price_per_m2) }}</div>
      </div>
      <div class="comparison-row" role="row">
        <div role="rowheader">Цветовая гамма</div>
        <div v-for="item in comparedMaterials" :key="item.slug">
          <span class="material-dot" :style="{ backgroundColor: item.color }" />{{ item.name }}
        </div>
      </div>
      <div class="comparison-row" role="row">
        <div role="rowheader">Отделка</div>
        <div v-for="item in comparedMaterials" :key="item.slug">{{ item.properties['Отделка'] }}</div>
      </div>
      <div class="comparison-row comparison-action-row" role="row">
        <div role="rowheader">Действие</div>
        <div v-for="item in comparedMaterials" :key="item.slug">
          <button class="text-link" @click="emit('estimate', item.slug)">Выбрать материал ↗</button>
        </div>
      </div>
    </div>
    <p v-if="!comparedMaterials.length" class="small-label">
      Выберите материалы выше, чтобы сравнить их параметры.
    </p>
  </section>
</template>
