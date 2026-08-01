<script setup lang="ts">
const { data: stores, pending } = await useFetch('/api/stores')

useSeoMeta({
  title: 'Магазины — White Smoke',
  description: 'Три магазина White Smoke в Дзержинске: адреса и часы работы'
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="max-w-2xl">
      <h1 class="font-display text-4xl text-white sm:text-5xl">
        Магазины
      </h1>
      <p class="mt-3 text-smoke-400">
        Три точки в Дзержинске. Зарезервируйте товар на витрине и заберите в удобном магазине.
      </p>
    </header>

    <div v-if="pending && !stores" class="mt-12 space-y-6">
      <div v-for="n in 3" :key="n" class="h-32 animate-pulse bg-smoke-900/40" />
    </div>

    <div v-else class="mt-12 grid gap-8 lg:grid-cols-3">
      <article
        v-for="store in stores"
        :key="store.slug"
        class="border border-white/5 bg-smoke-950/40 p-6 transition hover:border-mist-500/25"
      >
        <h2 class="font-display text-xl text-white">
          {{ store.name }}
        </h2>
        <p class="mt-4 text-smoke-300">
          {{ store.address }}
        </p>
        <p class="mt-2 text-sm text-smoke-500">
          {{ store.hours }}
        </p>
        <a
          v-if="store.phone"
          :href="`tel:${store.phone}`"
          class="mt-4 inline-flex items-center gap-2 text-mist-400 hover:text-mist-300"
        >
          <UIcon name="i-lucide-phone" class="size-4" />
          {{ store.phone }}
        </a>
        <div class="mt-6">
          <UButton
            :to="`/catalog?store=${store.slug}`"
            variant="soft"
            label="Товары здесь"
            trailing-icon="i-lucide-arrow-right"
          />
        </div>
      </article>
    </div>
  </div>
</template>
