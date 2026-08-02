<script setup lang="ts">
import type { CatalogProduct } from '#shared/types/catalog'

const props = defineProps<{
  product: CatalogProduct
}>()

const toast = useToast()
const { addItem } = useCart()
const quantity = ref(1)

const maxQty = computed(() => Math.max(1, props.product.totalStock))

watch(maxQty, (max) => {
  if (quantity.value > max) quantity.value = max
})

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}

function addToCart(e: Event) {
  e.preventDefault()
  e.stopPropagation()

  if (props.product.totalStock <= 0) {
    toast.add({ title: 'Нет в наличии', color: 'error' })
    return
  }

  const qty = Math.min(Math.max(1, quantity.value), maxQty.value)

  addItem({
    id: props.product.id,
    slug: props.product.slug,
    name: props.product.name,
    price: props.product.price,
    imageUrl: props.product.imageUrl
  }, qty)

  toast.add({
    title: 'В корзине',
    description: `${props.product.name} × ${qty}`,
    color: 'success',
    actions: [{
      label: 'К корзине',
      onClick: () => navigateTo('/cart')
    }]
  })
}
</script>

<template>
  <article class="group flex flex-col overflow-hidden border border-white/5 bg-smoke-950/40 transition duration-300 hover:border-mist-500/30 hover:bg-smoke-950/80">
    <NuxtLink
      :to="`/catalog/${product.slug}`"
      class="relative aspect-[4/3] overflow-hidden bg-smoke-900/50"
    >
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
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <NuxtLink :to="`/catalog/${product.slug}`" class="flex flex-1 flex-col gap-2">
        <p v-if="product.category" class="text-xs uppercase tracking-wider text-mist-500/80">
          {{ product.category }}
        </p>
        <h3 class="font-display text-base leading-snug text-white transition group-hover:text-mist-200">
          {{ product.name }}
        </h3>
        <p class="mt-auto pt-2 text-lg font-semibold text-white">
          {{ formatPrice(product.price) }}
        </p>
        <p class="text-xs text-smoke-500">
          В наличии: {{ product.totalStock }} шт.
        </p>
      </NuxtLink>

      <div class="mt-3 flex items-center gap-2">
        <UInputNumber
          v-model="quantity"
          :min="1"
          :max="maxQty"
          :disabled="product.totalStock <= 0"
          class="w-24 shrink-0"
          @click.stop
        />
        <UButton
          class="min-w-0 flex-1"
          icon="i-lucide-shopping-bag"
          label="В корзину"
          :disabled="product.totalStock <= 0"
          @click="addToCart"
        />
      </div>
    </div>
  </article>
</template>
