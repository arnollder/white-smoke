<script setup lang="ts">
import type { CatalogProduct } from '#shared/types/catalog'

defineProps<{
  product: CatalogProduct
}>()

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<template>
  <NuxtLink
    :to="`/catalog/${product.slug}`"
    class="group flex flex-col overflow-hidden border border-white/5 bg-smoke-950/40 transition duration-300 hover:border-mist-500/30 hover:bg-smoke-950/80"
  >
    <div class="relative aspect-[4/3] overflow-hidden bg-smoke-900/50">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
      >
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-smoke-600"
      >
        <UIcon name="i-lucide-package" class="size-10 opacity-40" />
      </div>
      <span
        v-if="product.totalStock <= 0"
        class="absolute left-3 top-3 bg-smoke-950/90 px-2 py-1 text-xs text-smoke-400"
      >
        Нет в наличии
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-2 p-4">
      <p v-if="product.category" class="text-xs uppercase tracking-wider text-mist-500/80">
        {{ product.category }}
      </p>
      <h3 class="font-display text-base font-semibold leading-snug text-white group-hover:text-mist-200">
        {{ product.name }}
      </h3>
      <p class="mt-auto pt-2 text-lg font-semibold text-white">
        {{ formatPrice(product.price) }}
      </p>
      <p class="text-xs text-smoke-500">
        В наличии: {{ product.totalStock }} шт.
      </p>
    </div>
  </NuxtLink>
</template>
