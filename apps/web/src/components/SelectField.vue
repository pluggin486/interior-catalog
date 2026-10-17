<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

export type SelectPosition = 'down' | 'up' | 'left' | 'right'
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    label: string
    options: readonly SelectOption[]
    position?: SelectPosition
    disabled?: boolean
    placeholder?: string
  }>(),
  { position: 'down', disabled: false, placeholder: 'Выберите вариант' },
)
const model = defineModel<string>({ required: true })
const id = useId()
const sides = { down: 'bottom', up: 'top', left: 'left', right: 'right' } as const
const side = computed(() => sides[props.position])
const selectedLabel = computed(
  () => props.options.find((option) => option.value === model.value)?.label ?? props.placeholder,
)
// Prefix every value so that the empty filter is a selectable item, rather than a placeholder.
const selectedValue = computed(() => `option:${model.value}`)
function updateValue(value: unknown) {
  if (typeof value === 'string' && value.startsWith('option:')) model.value = value.slice(7)
}
</script>

<template>
  <div class="select-field">
    <label :for="id" class="select-label">{{ label }}</label>
    <SelectRoot :model-value="selectedValue" :disabled="disabled" @update:model-value="updateValue">
      <SelectTrigger :id="id" class="select-trigger" :aria-label="label">
        <span class="select-value"
          ><SelectValue>{{ selectedLabel }}</SelectValue></span
        >
        <svg class="select-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          style="z-index: 50"
          position="popper"
          :side="side"
          align="start"
          :side-offset="8"
          :side-flip="false"
          :align-flip="false"
          :collision-padding="12"
        >
          <div class="select-popover">
            <SelectViewport as-child>
              <div class="select-options">
                <SelectItem
                  v-for="option in options"
                  :key="option.value"
                  :value="`option:${option.value}`"
                  :disabled="option.disabled"
                  class="select-option"
                >
                  <SelectItemText>{{ option.label }}</SelectItemText>
                  <SelectItemIndicator class="select-check">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="m4.5 10 3.5 3.5 7.5-7.5"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </SelectItemIndicator>
                </SelectItem>
              </div>
            </SelectViewport>
          </div>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

<style scoped>
.select-field {
  min-width: 0;
}

.select-label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--strong);
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.select-trigger:hover {
  border-color: #b39b84;
}

.select-trigger:focus-visible,
.select-trigger[data-state='open'] {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px rgb(123 91 58 / 14%);
}

.select-trigger[data-disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

.select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-chevron {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--accent);
  transition: transform 0.15s ease;
}

.select-trigger[data-state='open'] .select-chevron {
  transform: rotate(180deg);
}

.select-popover {
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: var(--reka-select-trigger-width);
  max-width: min(var(--reka-select-content-available-width), calc(100vw - 24px));
  max-height: min(280px, var(--reka-select-content-available-height));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-overlay);
  color: var(--strong);
  box-shadow: 0 14px 40px rgb(42 35 30 / 14%);
  font-family: inherit;
  font-size: 14px;
  transform-origin: var(--reka-select-content-transform-origin);
}

.select-options {
  min-height: 0;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: #b7a18c transparent;
}

.select-options::-webkit-scrollbar {
  display: block;
  width: 6px;
}

.select-options::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: #b7a18c;
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 7px;
  outline: none;
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
}

.select-option[data-state='checked'] {
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-weight: 600;
}

.select-option[data-highlighted] {
  background: #eee4d9;
  color: var(--accent-dark);
}

.select-option[data-disabled] {
  opacity: 0.45;
  pointer-events: none;
}

.select-check {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.select-check svg {
  display: block;
  width: 100%;
  height: 100%;
}

@media (forced-colors: active) {
  .select-trigger:focus-visible,
  .select-trigger[data-state='open'],
  .select-option[data-highlighted] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }

  .select-popover {
    border-color: CanvasText;
    background: Canvas;
  }
}
</style>
