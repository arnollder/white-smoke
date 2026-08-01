<script setup lang="ts">
const { data: stores } = await useFetch('/api/stores')
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative min-h-[100dvh] overflow-hidden" style="background: var(--ws-hero-glow)">
      <div
        class="pointer-events-none absolute inset-0 ws-haze"
        aria-hidden="true"
      >
        <div class="absolute -left-1/4 top-1/4 h-[50vh] w-[70vw] rounded-full bg-white/[0.03] blur-3xl" />
        <div class="absolute right-0 top-0 h-[40vh] w-[50vw] rounded-full bg-mist-500/10 blur-3xl" />
      </div>

      <div class="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6">
        <p class="ws-animate-rise text-sm font-medium uppercase tracking-[0.2em] text-mist-400">
          Дзержинск
        </p>
        <h1 class="ws-animate-rise-delay font-display mt-4 max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
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
        <h2 class="font-display text-3xl font-bold text-white sm:text-4xl">
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
            <h3 class="font-display text-xl font-semibold text-white">
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
