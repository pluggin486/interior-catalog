<script setup lang="ts">
import { watch } from 'vue'
import { useIMask } from 'vue-imask'

defineProps<{ disabled?: boolean }>()
const model = defineModel<string>({ required: true })

function normalizePrefix(value: string, mask: { value: string }) {
  return !mask.value && /^\D*8/.test(value) ? value.replace('8', '7') : value
}

const { el, masked } = useIMask(
  { mask: '+{7} (000) 000-00-00', prepare: normalizePrefix },
  {
    defaultValue: model.value,
    onAccept() {
      model.value = masked.value
    },
  },
)
watch(model, (value) => {
  masked.value = value
})
function clearEmptyPrefix() {
  if (masked.value.replace(/\D/g, '').length <= 1) masked.value = ''
}
</script>

<template>
  <input
    ref="el"
    :disabled="disabled"
    type="text"
    inputmode="tel"
    autocomplete="tel"
    required
    maxlength="18"
    pattern="\+7 \([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}"
    placeholder="+7 (___) ___-__-__"
    title="Введите номер целиком: +7 (999) 999-99-99"
    @blur="clearEmptyPrefix"
  />
</template>
