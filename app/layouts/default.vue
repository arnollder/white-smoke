<script setup lang="ts">
const { cartCount } = useCart()

const links = [
  { label: 'Каталог', to: '/catalog' },
  { label: 'Магазины', to: '/stores' }
]
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-[#0c0e10] text-smoke-100">
    <header class="sticky top-0 z-40 border-b border-white/5 bg-[#0c0e10]/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink to="/" class="heder-logo font-logo text-lg tracking-tight text-white sm:text-xl">
          <p class="logo-up">
            White
          </p>
          <p class="logo-down">
            Smoke
          </p>
        </NuxtLink>

        <nav class="hidden items-center gap-1 sm:flex">
          <UButton
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            class="nav-button text-smoke-300 hover:text-white"
          >
            {{ link.label }}
          </UButton>
        </nav>

        <div class="flex items-center gap-2">
          <UButton
            to="/cart"
            variant="soft"
            color="primary"
            icon="i-lucide-shopping-bag"
            :label="cartCount ? String(cartCount) : undefined"
            aria-label="Корзина"
          />
          <UButton
            to="/catalog"
            class="hidden sm:inline-flex"
            label="В витрину"
            trailing-icon="i-lucide-arrow-right"
          />
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-white/5 bg-smoke-950">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="font-display text-xl text-white">White Smoke</p>
          <p class="mt-1 text-sm text-smoke-400">Дзержинск, Нижегородская область</p>
          <p class="mt-4 max-w-md text-xs leading-relaxed text-smoke-500">
            Продажа табачной и никотиносодержащей продукции лицам старше 18 лет.
            Резерв и самовывоз — оплата при получении.
          </p>
        </div>
        <div class="flex flex-wrap gap-3 text-sm">
          <NuxtLink to="/catalog" class="text-smoke-400 transition hover:text-mist-400">Каталог</NuxtLink>
          <NuxtLink to="/stores" class="text-smoke-400 transition hover:text-mist-400">Магазины</NuxtLink>
          <NuxtLink to="/cart" class="text-smoke-400 transition hover:text-mist-400">Корзина</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.logo-up {
  transform: translate(0, 0.7rem);
}
.logo-down {
  transform: translate(1.2rem, -0.7rem);
}

.heder-logo {
  padding: 0 1rem 0 0.1rem;

  transform: translate(0, 1.8rem);
  font-size: 2rem;  
  border-top: 0.1rem solid;
  border-bottom: 0.1rem double;
  border-radius: 1rem 7rem 2rem 3rem;
}

.nav-button {
  text-transform: uppercase;  
  font-size: 1rem;
  letter-spacing: 0.1em;
}
</style>