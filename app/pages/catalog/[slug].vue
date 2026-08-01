<script setup lang="ts">
import type { CatalogProduct } from '#shared/types/catalog'

const route = useRoute()
const toast = useToast()
const { addItem } = useCart()

const slug = computed(() => String(route.params.slug))

const { data: product, error, pending } = await useFetch<CatalogProduct>(
  () => `/api/catalog/${slug.value}`
)

const quantity = ref(1)

watch(product, (p) => {
  if (p) {
    useSeoMeta({
      title: `${p.name} — White Smoke`,
      description: p.description || p.name
    })
  }
}, { immediate: true })

function addToCart() {
  if (!product.value) return
  if (product.value.totalStock <= 0) {
    toast.add({ title: 'Нет в наличии', color: 'error' })
    return
  }
  addItem({
    id: product.value.id,
    slug: product.value.slug,
    name: product.value.name,
    price: product.value.price,
    imageUrl: product.value.imageUrl
  }, quantity.value)
  toast.add({
    title: 'В корзине',
    description: product.value.name,
    color: 'success',
    actions: [{
      label: 'К корзине',
      onClick: () => navigateTo('/cart')
    }]
  })
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <UButton
      to="/#catalog"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      label="К витрине"
      class="mb-8"
    />

    <div v-if="pending && !product" class="grid gap-10 lg:grid-cols-2">
      <div class="aspect-square animate-pulse bg-smoke-900/40" />
      <div class="space-y-4">
        <div class="h-8 w-2/3 animate-pulse bg-smoke-900/40" />
        <div class="h-4 w-full animate-pulse bg-smoke-900/40" />
      </div>
    </div>

    <div v-else-if="error || !product" class="py-20 text-center text-smoke-400">
      Товар не найден
    </div>

    <div v-else class="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div class="aspect-square overflow-hidden border border-white/5 bg-smoke-950/50">
        <img
          v-if="product.imageUrl"
          :src="product.imageUrl"
          :alt="product.name"
          class="h-full w-full object-cover"
        >
        <div v-else class="flex h-full items-center justify-center text-smoke-600">
          <UIcon name="i-lucide-package" class="size-16 opacity-40" />
        </div>
      </div>

      <div>
        <p v-if="product.category" class="text-xs uppercase tracking-[0.15em] text-mist-500">
          {{ product.category }}
        </p>
        <h1 class="font-display mt-2 text-3xl text-white sm:text-4xl">
          {{ product.name }}
        </h1>
        <p v-if="product.article" class="mt-2 text-sm text-smoke-500">
          Арт. {{ product.article }}
        </p>
        <p class="mt-6 text-3xl font-semibold text-white">
          {{ formatPrice(product.price) }}
        </p>
        <p v-if="product.description" class="mt-6 text-smoke-400 leading-relaxed">
          {{ product.description }}
        </p>

        <div class="mt-8">
          <h2 class="mb-3 text-sm font-medium text-smoke-300">
            Наличие в магазинах
          </h2>
          <CatalogStockByStore :stocks="product.stocks" />
        </div>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <UInputNumber
            v-model="quantity"
            :min="1"
            :max="Math.max(1, product.totalStock)"
            class="w-28"
          />
          <UButton
            size="lg"
            label="В корзину"
            icon="i-lucide-shopping-bag"
            :disabled="product.totalStock <= 0"
            @click="addToCart"
          />
        </div>
        <p class="mt-3 text-xs text-smoke-500">
          Резерв или доставка — без оплаты на сайте. Оплата при получении.
        </p>
      </div>
    </div>
  </div>
</template>
