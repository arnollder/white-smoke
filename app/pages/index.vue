<script setup lang="ts">
const { data: stores } = await useFetch('/api/stores')
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative min-h-[100dvh] overflow-hidden bg-[#0c0e10]">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src="/images/smoke-bg.jpeg"
          alt=""
          class="absolute inset-0 h-full w-full object-cover object-center opacity-[0.18] saturate-50 blur-[2px] scale-105 ws-haze"
        >
        <div
          class="absolute inset-0"
          style="background: linear-gradient(180deg, rgba(12,14,16,0.55) 0%, rgba(12,14,16,0.72) 45%, rgba(12,14,16,0.92) 100%), radial-gradient(ellipse 70% 50% at 50% 40%, rgba(45,212,191,0.06), transparent 65%)"
        />
      </div>

      <div class="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6">
        <p class="ws-animate-rise text-sm font-medium uppercase tracking-[0.2em] text-mist-400">
          Дзержинск
        </p>
        <h1 class="ws-animate-rise-delay font-display mt-4 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
          White Smoke
        </h1>
        <p class="ws-animate-rise-delay-2 mt-6 max-w-lg text-lg text-smoke-300 sm:text-xl">
          Вейп и табак с живыми остатками. Зарезервируйте в одном из трёх магазинов или закажите доставку по городу.
        </p>
        <div class="ws-animate-rise-delay-2 mt-10 flex flex-wrap gap-3">
          <UButton
            to="/catalog"
            size="xl"
            label="Смотреть витрину"
            trailing-icon="i-lucide-arrow-right"
          />
          <UButton
            to="/stores"
            size="xl"
            color="neutral"
            variant="outline"
            label="Три магазина"
          />
        </div>
      </div>
    </section>

    <!-- Stores teaser -->
    <section class="border-t border-white/5 bg-smoke-950/50 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="font-display text-3xl text-white sm:text-4xl">
          Заберите там, где удобно
        </h2>
        <p class="mt-3 max-w-xl text-smoke-400">
          Остатки обновляются из МойСклад. Резерв держит товар до вашего визита.
        </p>

        <div class="mt-12 grid gap-8 sm:grid-cols-3">
          <article
            v-for="(store, index) in (stores || [])"
            :key="store.slug"
            class="ws-fade-in border-t border-mist-500/30 pt-6"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <h3 class="font-display text-xl text-white">
              {{ store.name }}
            </h3>
            <p class="mt-2 text-sm text-smoke-400">
              {{ store.address }}
            </p>
            <p class="mt-1 text-sm text-smoke-500">
              {{ store.hours }}
            </p>
            <a
              v-if="store.phone"
              :href="`tel:${store.phone}`"
              class="mt-3 inline-block text-sm text-mist-400 hover:text-mist-300"
            >
              {{ store.phone }}
            </a>
          </article>
        </div>

        <div class="mt-12">
          <UButton to="/catalog" variant="soft" label="Перейти в каталог" trailing-icon="i-lucide-chevron-right" />
        </div>
      </div>
    </section>
  </div>
</template>
