<script setup lang="ts">
const emit = defineEmits<{ navigate: [screen: 'catalog' | 'materials' | 'calculator'] }>()
</script>

<template>
  <section class="hero">
    <div class="hero-copy">
      <span class="eyebrow">Мебель по вашему пространству</span>
      <h1>Сравните материалы.<br /><em>Найдите свой вариант.</em></h1>
      <p>
        Каталог продуманных решений для дома. Выберите изделие, сравните отделки и соберите предварительную
        смету.
      </p>
      <div class="actions">
        <button class="button button-primary" @click="emit('navigate', 'catalog')">
          Смотреть каталог <span aria-hidden="true">↗</span></button
        ><button class="button button-plain" @click="emit('navigate', 'materials')">
          Сравнить материалы
        </button>
      </div>
      <div class="hero-note">
        <span class="note-dot" /> Демонстрационный каталог · 12 решений для интерьера
      </div>
    </div>
    <div class="hero-art" aria-label="Схематичное изображение мебели и интерьера" role="img">
      <div class="hero-scene" aria-hidden="true">
        <div class="art-window"><span /><span /><span /></div>
        <div class="art-cabinet">
          <div class="cabinet-top" />
          <div class="cabinet-body"><span /><span /><span /></div>
        </div>
        <div class="art-table"><span /><i /></div>
        <div class="art-vase" />
        <div class="art-plant"><i /><i /><i /><b /></div>
      </div>
      <div class="art-caption">Тактильные материалы<br />и точная геометрия</div>
    </div>
  </section>
  <section class="section intro-row">
    <div>
      <span class="eyebrow">Как устроен выбор</span>
      <h2>От идеи — к понятному плану</h2>
    </div>
    <p class="section-copy">
      Сопоставьте свойства материалов, выберите подходящие услуги и передайте мастеру уже собранный контекст.
    </p>
  </section>
  <section class="feature-grid">
    <button class="feature-card" @click="emit('navigate', 'catalog')">
      <span class="feature-number">01</span>
      <h3>Изучите изделия</h3>
      <p>Сравните размеры, диапазоны стоимости и варианты отделки.</p>
      <span class="feature-link">Открыть каталог <b>↗</b></span>
    </button>
    <button class="feature-card" @click="emit('navigate', 'materials')">
      <span class="feature-number">02</span>
      <h3>Сравните материалы</h3>
      <p>Посмотрите свойства и выберите основу для вашего проекта.</p>
      <span class="feature-link">К материалам <b>↗</b></span>
    </button>
    <button class="feature-card" @click="emit('navigate', 'calculator')">
      <span class="feature-number">03</span>
      <h3>Соберите расчёт</h3>
      <p>Введите размеры и добавьте нужные услуги к проекту.</p>
      <span class="feature-link">Начать расчёт <b>↗</b></span>
    </button>
  </section>
  <section class="demo-note">
    Цены, характеристики и тарифы в этой версии приведены только для демонстрации интерфейса.
  </section>
</template>

<style scoped>
.hero-art {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}

.hero-scene {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.hero-art .art-cabinet {
  top: auto;
  bottom: 5px;
  transform-origin: bottom right;
}

.art-caption {
  position: static;
  padding: 16px 25px 22px;
  line-height: 1.3;
}

@media (max-width: 620px) {
  .art-caption {
    padding: 12px 20px 18px;
    font-size: 14px;
  }
}
</style>
