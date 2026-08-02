<script setup lang="ts">
import type { FulfillmentType, OrderResponse, PublicStore } from '#shared/types/catalog'

const { items, cartTotal, setQuantity, removeItem, clearCart, load } = useCart()
const toast = useToast()
const config = useRuntimeConfig()

onMounted(load)

const { data: stores } = await useFetch<PublicStore[]>('/api/stores', { key: 'stores-all' })

const fulfillment = ref<FulfillmentType>('pickup')
const storeSlug = ref('')
const name = ref('')
const phone = ref('')
const address = ref('')
const comment = ref('')
const submitting = ref(false)

watch(stores, (s) => {
  if (s?.length && !storeSlug.value) {
    storeSlug.value = s[0]!.slug
  }
}, { immediate: true })

const storeItems = computed(() =>
  (stores.value || []).map(s => ({ label: `${s.name} — ${s.address}`, value: s.slug }))
)

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}

async function submitOrder() {
  if (!items.value.length) {
    toast.add({ title: 'Корзина пуста', color: 'warning' })
    return
  }
  if (!name.value.trim() || phone.value.replace(/\D/g, '').length < 10) {
    toast.add({ title: 'Укажите имя и телефон', color: 'error' })
    return
  }
  if (fulfillment.value === 'pickup' && !storeSlug.value) {
    toast.add({ title: 'Выберите магазин', color: 'error' })
    return
  }
  if (fulfillment.value === 'delivery' && !address.value.trim()) {
    toast.add({ title: 'Укажите адрес в Дзержинске', color: 'error' })
    return
  }

  if (config.public.staticHosting) {
    toast.add({
      title: 'Демо на GitHub Pages',
      description: 'Оформление заказа доступно на полном сервере с API МойСклад.',
      color: 'warning'
    })
    return
  }

  submitting.value = true
  try {
    const order = await $fetch<OrderResponse>('/api/orders', {
      method: 'POST',
      body: {
        items: items.value.map(i => ({ id: i.id, quantity: i.quantity })),
        fulfillment: fulfillment.value,
        storeSlug: fulfillment.value === 'pickup' ? storeSlug.value : undefined,
        name: name.value.trim(),
        phone: phone.value.trim(),
        address: fulfillment.value === 'delivery' ? address.value.trim() : undefined,
        comment: comment.value.trim() || undefined
      }
    })
    clearCart()
    await navigateTo(`/order/${order.id}?name=${encodeURIComponent(order.name)}`)
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.add({
      title: 'Не удалось оформить',
      description: e.data?.statusMessage || e.statusMessage || e.message || 'Ошибка сервера',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

useSeoMeta({
  title: 'Корзина — White Smoke',
  description: 'Резерв самовывоза или доставка по Дзержинску'
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <h1 class="font-display text-4xl text-white sm:text-5xl">
      Корзина
    </h1>

    <div v-if="!items.length" class="mt-16 text-center">
      <UIcon name="i-lucide-shopping-bag" class="mx-auto size-12 text-smoke-600" />
      <p class="mt-4 text-smoke-400">Пока пусто</p>
      <UButton to="/catalog" class="mt-6" label="В витрину" />
    </div>

    <div v-else class="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
      <div class="space-y-4">
        <article
          v-for="item in items"
          :key="item.id"
          class="flex gap-4 border border-white/5 bg-smoke-950/40 p-4"
        >
          <div class="size-20 shrink-0 overflow-hidden bg-smoke-900/50">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.name"
              class="h-full w-full object-cover"
            >
            <div v-else class="flex h-full items-center justify-center text-smoke-600">
              <UIcon name="i-lucide-package" class="size-6 opacity-40" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="`/catalog/${item.slug}`"
              class="font-medium text-white hover:text-mist-300"
            >
              {{ item.name }}
            </NuxtLink>
            <p class="mt-1 text-sm text-smoke-400">
              {{ formatPrice(item.price) }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              <UInputNumber
                :model-value="item.quantity"
                :min="1"
                class="w-28"
                @update:model-value="(v: number) => setQuantity(item.id, v)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Удалить"
                @click="removeItem(item.id)"
              />
            </div>
          </div>
          <p class="shrink-0 font-semibold text-white">
            {{ formatPrice(item.price * item.quantity) }}
          </p>
        </article>
      </div>

      <aside class="h-fit border border-white/5 bg-smoke-950/60 p-6 lg:sticky lg:top-24">
        <p class="flex justify-between text-lg">
          <span class="text-smoke-400">Итого</span>
          <span class="font-semibold text-white">{{ formatPrice(cartTotal) }}</span>
        </p>
        <p class="mt-2 text-xs text-smoke-500">
          Оплата при получении. Онлайн-оплата — позже.
        </p>

        <fieldset class="mt-8 space-y-3">
          <legend class="text-sm font-medium text-smoke-300">Способ получения</legend>
          <label class="flex cursor-pointer items-start gap-3 rounded border border-white/5 p-3 has-[:checked]:border-mist-500/40">
            <input v-model="fulfillment" type="radio" value="pickup" class="mt-1 accent-teal-400">
            <span>
              <span class="block text-white">Самовывоз</span>
              <span class="text-xs text-smoke-500">Резерв в одном из трёх магазинов</span>
            </span>
          </label>
          <label class="flex cursor-pointer items-start gap-3 rounded border border-white/5 p-3 has-[:checked]:border-mist-500/40">
            <input v-model="fulfillment" type="radio" value="delivery" class="mt-1 accent-teal-400">
            <span>
              <span class="block text-white">Доставка по Дзержинску</span>
              <span class="text-xs text-smoke-500">В пределах города</span>
            </span>
          </label>
        </fieldset>

        <div class="mt-6 space-y-4">
          <USelect
            v-if="fulfillment === 'pickup'"
            v-model="storeSlug"
            :items="storeItems"
            value-key="value"
            label-key="label"
            placeholder="Магазин"
          />
          <UInput
            v-if="fulfillment === 'delivery'"
            v-model="address"
            placeholder="Улица, дом, квартира (Дзержинск)"
          />
          <UInput v-model="name" placeholder="Имя" autocomplete="name" />
          <UInput v-model="phone" placeholder="Телефон" type="tel" autocomplete="tel" />
          <UTextarea v-model="comment" placeholder="Комментарий (необязательно)" :rows="2" />
        </div>

        <UButton
          class="mt-6 w-full"
          size="lg"
          :loading="submitting"
          :label="fulfillment === 'pickup' ? 'Зарезервировать' : 'Заказать доставку'"
          @click="submitOrder"
        />
      </aside>
    </div>
  </div>
</template>
