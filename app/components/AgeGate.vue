<script setup lang="ts">
const AGE_KEY = 'ws-age-confirmed'

const open = ref(false)

onMounted(() => {
  if (import.meta.client && !localStorage.getItem(AGE_KEY)) {
    open.value = true
  }
})

function confirmAge() {
  localStorage.setItem(AGE_KEY, '1')
  open.value = false
}

function denyAge() {
  window.location.href = 'https://www.google.com'
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :ui="{ overlay: 'bg-black/80' }"
  >
    <template #content>
      <div class="p-6 sm:p-8">
        <p class="font-display text-2xl font-bold text-highlighted">
          White Smoke
        </p>
        <p class="mt-4 text-sm text-muted">
          Продажа табачной и никотиносодержащей продукции только лицам старше 18 лет.
          Вам уже исполнилось 18 лет?
        </p>
        <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton color="neutral" variant="ghost" label="Нет" block class="sm:w-auto" @click="denyAge" />
          <UButton color="primary" label="Да, мне есть 18" block class="sm:w-auto" @click="confirmAge" />
        </div>
      </div>
    </template>
  </UModal>
</template>
