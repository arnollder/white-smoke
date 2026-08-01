<script setup lang="ts">
import type { CatalogProduct } from '#shared/types/catalog'

const route = useRoute()
const router = useRouter()

/** Sentinel — SelectItem forbids empty-string values. */
const ALL = 'all'

const q = ref(String(route.query.q || ''))
const category = ref(String(route.query.category || ALL))
const store = ref(String(route.query.store || ALL))
const inStock = ref(route.query.inStock !== '0')

const queryParams = computed(() => ({
  q: q.value || undefined,
  category: category.value !== ALL ? category.value : undefined,
  store: store.value !== ALL ? store.value : undefined,
  inStock: inStock.value ? '1' : '0'
}))

const { data, pending, refresh } = await useFetch<{
  products: CatalogProduct[]
  categories: string[]
  total: number
}>('/api/catalog', {
  query: queryParams,
  watch: [queryParams]
})

const { data: stores } = await useFetch('/api/stores')

const storeOptions = computed(() => [
  { label: 'Все магазины', value: ALL },
  ...(stores.value || []).map(s => ({ label: s.name, value: s.slug }))
])

const categoryOptions = computed(() => [
  { label: 'Все категории', value: ALL },
  ...(data.value?.categories || []).map(c => ({ label: c, value: c }))
])

watch([q, category, store, inStock], () => {
  router.replace({
    query: {
      ...(q.value ? { q: q.value } : {}),
      ...(category.value !== ALL ? { category: category.value } : {}),
      ...(store.value !== ALL ? { store: store.value } : {}),
      ...(inStock.value ? {} : { inStock: '0' })
    }
  })
})

useSeoMeta({
  title: 'Каталог — White Smoke',
  description: 'Витрина вейп и табачной продукции White Smoke в Дзержинске'
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="max-w-2xl">
      <h1 class="font-display text-4xl font-bold text-white sm:text-5xl">
        Витрина
      </h1>
      <p class="mt-3 text-smoke-400">
        Остатки по трём магазинам в Дзержинске — в реальном времени из МойСклад.
      </p>
    </header>

    <div class="mt-10 flex flex-col gap-4 lg:flex-row lg:items-end">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Поиск…"
        size="lg"
        class="w-full lg:max-w-xs"
        :ui="{ base: 'bg-smoke-950/60' }"
      />
      <USelect
        v-model="category"
        :items="categoryOptions"
        value-key="value"
        label-key="label"
        placeholder="Категория"
        size="lg"
        class="w-full lg:w-56"
      />
      <USelect
        v-model="store"
        :items="storeOptions"
        value-key="value"
        label-key="label"
        placeholder="Магазин"
        size="lg"
        class="w-full lg:w-64"
      />
      <label class="flex items-center gap-2 text-sm text-smoke-400">
        <UCheckbox v-model="inStock" />
        Только в наличии
      </label>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        aria-label="Обновить"
        @click="refresh()"
      />
    </div>

    <p class="mt-6 text-sm text-smoke-500">
      Найдено: {{ data?.total ?? 0 }}
    </p>

    <div v-if="pending && !data" class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="aspect-[3/4] animate-pulse bg-smoke-900/40"
      />
    </div>

    <div
      v-else-if="data?.products?.length"
      class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <CatalogProductCard
        v-for="product in data.products"
        :key="product.id"
        :product="product"
      />
    </div>

    <div v-else class="mt-16 text-center text-smoke-500">
      <UIcon name="i-lucide-search-x" class="mx-auto size-10 opacity-40" />
      <p class="mt-4">Ничего не найдено. Снимите фильтры или обновите витрину.</p>
    </div>
  </div>
</template>
