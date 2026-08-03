<script setup lang="ts">
import type { CatalogProduct } from '#shared/types/catalog'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

/** Sentinel — SelectItem forbids empty-string values. */
const ALL = 'all'
const PAGE_SIZE = 24

const q = ref(String(route.query.q || ''))
const category = ref(String(route.query.category || ALL))
const store = ref(String(route.query.store || ALL))
const inStock = ref(route.query.inStock !== '0')
const page = ref(Math.max(1, Number(route.query.page || 1) || 1))

const forceRefresh = ref(false)

const catalogQuery = computed(() => ({
  q: q.value.trim() || undefined,
  category: category.value !== ALL ? category.value : undefined,
  store: store.value !== ALL ? store.value : undefined,
  inStock: inStock.value,
  page: page.value,
  pageSize: PAGE_SIZE,
  refresh: forceRefresh.value || undefined
}))

const { data, pending, refresh, error } = await useCatalogPage(catalogQuery)
const { data: stores } = await useFetch('/api/stores', { key: 'stores-all' })

const storeOptions = computed(() => [
  { label: 'Все магазины', value: ALL },
  ...(stores.value || []).map(s => ({ label: s.name, value: s.slug }))
])

const categoryOptions = computed(() => [
  { label: 'Все категории', value: ALL },
  ...(data.value?.categories || []).map(c => ({ label: c, value: c }))
])

const products = computed<CatalogProduct[]>(() => data.value?.products || [])
const total = computed(() => data.value?.total ?? 0)
const pageCount = computed(() => data.value?.pageCount ?? 1)

watch([q, category, store, inStock], () => {
  page.value = 1
})

watch([q, category, store, inStock, page], () => {
  router.replace({
    query: {
      ...(q.value ? { q: q.value } : {}),
      ...(category.value !== ALL ? { category: category.value } : {}),
      ...(store.value !== ALL ? { store: store.value } : {}),
      ...(inStock.value ? {} : { inStock: '0' }),
      ...(page.value > 1 ? { page: String(page.value) } : {})
    }
  })
})

watch(() => route.query.page, (value) => {
  const next = Math.max(1, Number(value || 1) || 1)
  if (next !== page.value) page.value = next
})

function goPrev() {
  if (page.value > 1) page.value -= 1
}

function goNext() {
  if (page.value < pageCount.value) page.value += 1
}

async function hardRefresh() {
  page.value = 1
  forceRefresh.value = true
  try {
    await refresh()
  } finally {
    forceRefresh.value = false
  }
}

useSeoMeta({
  title: 'Каталог — White Smoke',
  description: 'Витрина вейп и табачной продукции White Smoke в Дзержинске'
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="max-w-2xl">
      <h1 class="font-display text-4xl text-white sm:text-5xl">
        Витрина
      </h1>
      <p class="mt-3 text-smoke-400">
        Остатки по трём магазинам в Дзержинске — снимок из МойСклад с быстрым кэшем.
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
        v-if="!config.public.staticHosting"
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        aria-label="Обновить"
        @click="hardRefresh()"
      />
    </div>

    <p class="mt-6 text-sm text-smoke-500">
      Найдено: {{ total }}
      <span v-if="pageCount > 1"> · страница {{ data?.page || page }} из {{ pageCount }}</span>
    </p>

    <p v-if="error" class="mt-4 text-sm text-red-400">
      Не удалось загрузить витрину. Попробуйте обновить через несколько секунд.
    </p>

    <div v-if="pending && !products.length" class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="aspect-[3/4] animate-pulse bg-smoke-900/40"
      />
    </div>

    <div
      v-else-if="products.length"
      class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      :class="{ 'opacity-60': pending }"
    >
      <CatalogProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <div v-else class="mt-16 text-center text-smoke-500">
      <UIcon name="i-lucide-search-x" class="mx-auto size-10 opacity-40" />
      <p class="mt-4">Ничего не найдено. Снимите фильтры или обновите витрину.</p>
    </div>

    <div
      v-if="pageCount > 1"
      class="mt-10 flex flex-wrap items-center justify-center gap-3"
    >
      <UButton
        color="neutral"
        variant="outline"
        label="Назад"
        :disabled="page <= 1 || pending"
        @click="goPrev"
      />
      <span class="text-sm tabular-nums text-smoke-400">
        {{ data?.page || page }} / {{ pageCount }}
      </span>
      <UButton
        color="neutral"
        variant="outline"
        label="Вперёд"
        :disabled="page >= pageCount || pending"
        @click="goNext"
      />
    </div>
  </div>
</template>
