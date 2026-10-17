<script setup lang="ts">
defineProps<{ tone?: string; category?: string }>()
</script>
<template>
  <svg viewBox="0 0 520 360" class="furniture-art" aria-hidden="true">
    <rect x="80" y="62" width="360" height="220" rx="18" class="art-room" />
    <path d="M80 250h360" class="art-floor" />
    <g v-if="category === 'kitchens'">
      <rect x="120" y="162" width="280" height="88" rx="5" class="art-cabinet-fill" />
      <path d="M120 162h280M188 163v86m72-86v86m72-86v86" class="art-line" />
      <rect x="105" y="143" width="310" height="20" rx="6" class="art-counter" />
      <rect x="143" y="96" width="230" height="44" rx="7" class="art-upper" />
      <path d="M218 97v42m78-42v42" class="art-line" />
      <circle cx="178" cy="206" r="3" class="art-knob" />
      <circle cx="226" cy="206" r="3" class="art-knob" />
      <circle cx="300" cy="206" r="3" class="art-knob" />
    </g>
    <g v-else-if="category === 'wardrobes'">
      <rect x="158" y="84" width="205" height="166" rx="6" class="art-cabinet-fill" />
      <path d="M260 85v164" class="art-line" />
      <path d="M246 157v18m28-18v18" class="art-handle" />
      <path d="M151 250h220" class="art-shadow" />
    </g>
    <g v-else-if="category === 'tables'">
      <path d="M154 168h214l-14 27H168z" class="art-counter" />
      <path d="M190 195l-10 55m148-55 12 55" class="art-leg" />
      <circle cx="210" cy="146" r="26" class="art-chair" />
      <path d="M192 164v42m36-42v42" class="art-line" />
    </g>
    <g v-else>
      <rect x="178" y="86" width="164" height="166" rx="7" class="art-upper" />
      <path d="M178 141h164m-164 55h164m-109-110v166m55-166v166" class="art-line" />
      <path d="M170 253h180" class="art-shadow" />
    </g>
    <path d="M110 100l17-28 18 28m-26-8h17" class="art-plant" />
    <path d="M380 215h35v35h-35z" class="art-pot" />
    <path
      d="M397 215c-20-35 2-42 7-55 13 17 19 31-7 55zm3 0c-5-34 16-40 27-45-1 23-7 36-27 45zm-4-2c-14-22-6-35 1-44 13 20 15 31-1 44z"
      class="art-leaf"
    />
  </svg>
</template>
