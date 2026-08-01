<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))
const orderName = computed(() => String(route.query.name || id.value))

useSeoMeta({
  title: 'Заказ оформлен — White Smoke'
})
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
    <div class="flex size-16 items-center justify-center rounded-full bg-mist-500/15 text-mist-400">
      <UIcon name="i-lucide-check" class="size-8" />
    </div>
    <h1 class="font-display mt-8 text-3xl text-white sm:text-4xl">
      Готово
    </h1>
    <p class="mt-4 text-smoke-400">
      Заявка <span class="text-white">{{ orderName }}</span> принята.
      Оплата при получении. Если это самовывоз — товар зарезервирован в выбранном магазине.
    </p>
    <p class="mt-2 text-xs text-smoke-600">
      ID: {{ id }}
    </p>
    <div class="mt-10 flex flex-wrap justify-center gap-3">
      <UButton to="/#catalog" label="В витрину" />
      <UButton to="/#stores" color="neutral" variant="outline" label="Адреса магазинов" />
    </div>
  </div>
</template>
