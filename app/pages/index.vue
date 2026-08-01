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

function filterByStore(slug: string) {
  store.value = slug
  nextTick(() => {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
  })
}
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
            to="#catalog"
            size="xl"
            label="Смотреть витрину"
            trailing-icon="i-lucide-arrow-right"
          />
          <UButton
            to="#stores"
            size="xl"
            color="neutral"
            variant="outline"
            label="Три магазина"
          />
        </div>
      </div>
    </section>

    <!-- Stores -->
    <section id="stores" class="scroll-mt-20 border-t border-white/5 bg-smoke-950/50 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="font-display text-3xl text-white sm:text-4xl">
          Заберите там, где удобно
        </h2>
        <p class="mt-3 max-w-xl text-smoke-400">
          Три точки в Дзержинске. Остатки обновляются из МойСклад — резерв держит товар до визита.
        </p>

        <div class="mt-12 grid gap-8 sm:grid-cols-3">
          <article
            v-for="(s, index) in (stores || [])"
            :key="s.slug"
            class="ws-fade-in border-t border-mist-500/30 pt-6"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <h3 class="font-display text-xl text-white">
              {{ s.name }}
            </h3>
            <p class="mt-2 text-sm text-smoke-400">
              {{ s.address }}
            </p>
            <p class="mt-1 text-sm text-smoke-500">
              {{ s.hours }}
            </p>
            <a
              v-if="s.phone"
              :href="`tel:${s.phone}`"
              class="mt-3 inline-flex items-center gap-2 text-sm text-mist-400 hover:text-mist-300"
            >
              <UIcon name="i-lucide-phone" class="size-3.5" />
              {{ s.phone }}
            </a>
            <div class="mt-4">
              <UButton
                variant="soft"
                size="sm"
                label="Товары здесь"
                trailing-icon="i-lucide-arrow-right"
                @click="filterByStore(s.slug)"
              />
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Catalog -->
    <section id="catalog" class="scroll-mt-20 border-t border-white/5 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <header class="max-w-2xl">
          <h2 class="font-display text-3xl text-white sm:text-4xl">
            Витрина
          </h2>
          <p class="mt-3 text-smoke-400">
            Остатки по трём магазинам — в реальном времени из МойСклад.
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
    </section>
  </div>
</template>
