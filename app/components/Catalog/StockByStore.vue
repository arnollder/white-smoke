<script setup lang="ts">
import type { StoreStock } from '#shared/types/catalog'

defineProps<{
  stocks: StoreStock[]
}>()
</script>

<template>
  <ul class="divide-y divide-white/5 border border-white/5">
    <li
      v-for="s in stocks"
      :key="s.storeSlug"
      class="flex items-center justify-between gap-4 px-4 py-3 text-sm"
    >
      <span class="text-smoke-300">{{ s.storeName }}</span>
      <span
        class="font-medium tabular-nums"
        :class="s.stock > 0 ? 'text-mist-400' : 'text-smoke-600'"
      >
        {{ s.stock > 0 ? `${s.stock} шт.` : 'нет' }}
      </span>
    </li>
  </ul>
</template>
