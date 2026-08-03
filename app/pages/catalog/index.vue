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

const listTop = ref<HTMLElement | null>(null)

function scrollToListTop() {
  if (!import.meta.client) return
  nextTick(() => {
    // 'instant' overrides html { scroll-behavior: smooth }
    listTop.value?.scrollIntoView({ behavior: 'instant', block: 'start' })
  })
}

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

watch(page, (next, prev) => {
  if (prev !== undefined && next !== prev) scrollToListTop()
})

function goPrev() {
  if (page.value > 1) page.value -= 1
}

function goNext() {
  if (page.value < pageCount.value) page.value += 1
}

/** Draft for the page input — commit on Enter/blur so typing doesn't refetch each digit. */
const pageInput = ref(String(page.value))

watch(page, (value) => {
  pageInput.value = String(value)
})

function commitPageInput() {
  const raw = Number.parseInt(pageInput.value.replace(/\D/g, ''), 10)
  if (!Number.isFinite(raw)) {
    pageInput.value = String(page.value)
    return
  }
  const next = Math.min(pageCount.value, Math.max(1, raw))
  pageInput.value = String(next)
  if (next !== page.value) page.value = next
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

    <p ref="listTop" class="mt-6 scroll-mt-24 text-sm text-smoke-500">
      Найдено: {{ total }}
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

    <nav
      v-if="pageCount > 1"
      class="ws-pager mt-14 flex items-center justify-center gap-1 border-t border-white/5 pt-8"
      aria-label="Страницы витрины"
    >
      <button
        type="button"
        class="ws-pager-btn"
        :disabled="page <= 1 || pending"
        aria-label="Предыдущая страница"
        @click="goPrev"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>

      <div class="ws-pager-jump">
        <label class="sr-only" for="catalog-page-input">Номер страницы</label>
        <input
          id="catalog-page-input"
          v-model="pageInput"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          :disabled="pending"
          class="ws-pager-input"
          @keydown.enter.prevent="commitPageInput"
          @blur="commitPageInput"
        >
        <span class="ws-pager-total" aria-hidden="true">/ {{ pageCount }}</span>
      </div>

      <button
        type="button"
        class="ws-pager-btn"
        :disabled="page >= pageCount || pending"
        aria-label="Следующая страница"
        @click="goNext"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
.ws-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--color-smoke-400);
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  border: 1px solid transparent;
}

.ws-pager-btn:hover:not(:disabled) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.03);
}

.ws-pager-btn:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.ws-pager-jump {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  margin: 0 0.35rem;
  padding: 0 0.25rem;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

.ws-pager-input {
  width: 3.25rem;
  height: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #fff;
  text-align: center;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  outline: none;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.ws-pager-input:hover:not(:disabled) {
  border-color: rgba(45, 212, 191, 0.35);
}

.ws-pager-input:focus {
  border-color: rgba(45, 212, 191, 0.55);
  background-color: rgba(45, 212, 191, 0.04);
}

.ws-pager-input:disabled {
  opacity: 0.45;
}

.ws-pager-total {
  min-width: 2.5rem;
  color: var(--color-smoke-500);
  font-size: 0.8rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
