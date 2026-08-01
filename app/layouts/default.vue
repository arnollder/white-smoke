<script setup lang="ts">
const route = useRoute()
const { cartCount } = useCart()

const links = [
  { label: 'Витрина', to: '/#catalog', hash: 'catalog' },
  { label: 'Магазины', to: '/#stores', hash: 'stores' }
] as const

const activeHash = ref('')
let sectionObserver: IntersectionObserver | null = null

function syncActiveFromRoute() {
  const h = String(route.hash || '').replace(/^#/, '')
  if (h) {
    activeHash.value = h
    return
  }
  if (route.path !== '/') {
    activeHash.value = ''
  }
}

function teardownObserver() {
  sectionObserver?.disconnect()
  sectionObserver = null
}

function setupObserver() {
  teardownObserver()
  if (!import.meta.client || route.path !== '/') return

  const ids = links.map(l => l.hash)
  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      const top = visible[0]
      if (top?.target?.id) {
        activeHash.value = top.target.id
      }
    },
    {
      rootMargin: '-20% 0px -55% 0px',
      threshold: [0, 0.25, 0.5]
    }
  )

  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) sectionObserver.observe(el)
  }
}

watch(() => [route.path, route.hash], () => {
  syncActiveFromRoute()
  nextTick(setupObserver)
}, { immediate: true })

onBeforeUnmount(teardownObserver)

function isActive(hash: string) {
  return activeHash.value === hash
}
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

        <nav class="ws-nav hidden items-center gap-8 sm:flex" aria-label="Основная">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="ws-nav-link font-display"
            :class="{ 'is-active': isActive(link.hash) }"
          >
            <span class="ws-nav-label">{{ link.label }}</span>
            <span class="ws-nav-line" aria-hidden="true" />
          </NuxtLink>
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
          <NuxtLink
            to="/#catalog"
            class="ws-nav-cta hidden sm:inline-flex"
          >
            В витрину
            <UIcon name="i-lucide-arrow-up-right" class="size-4" />
          </NuxtLink>
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
          <NuxtLink to="/#catalog" class="text-smoke-400 transition hover:text-mist-400">Витрина</NuxtLink>
          <NuxtLink to="/#stores" class="text-smoke-400 transition hover:text-mist-400">Магазины</NuxtLink>
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

.ws-nav-link {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  color: var(--color-smoke-400);
  text-decoration: none;
  transition: color 0.25s ease;
}

.ws-nav-label {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  transition: letter-spacing 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.ws-nav-line {
  display: block;
  height: 1px;
  width: 100%;
  transform: scaleX(0);
  transform-origin: left center;
  background: linear-gradient(90deg, var(--color-mist-400), transparent 85%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.ws-nav-link:hover,
.ws-nav-link.is-active {
  color: #fff;
}

.ws-nav-link:hover .ws-nav-label,
.ws-nav-link.is-active .ws-nav-label {
  letter-spacing: 0.28em;
  transform: translateX(1px);
}

.ws-nav-link:hover .ws-nav-line,
.ws-nav-link.is-active .ws-nav-line {
  transform: scaleX(1);
}

.ws-nav-cta {
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-smoke-200);
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background-color 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.ws-nav-cta:hover {
  color: #fff;
  border-color: rgba(45, 212, 191, 0.45);
  background-color: rgba(45, 212, 191, 0.08);
  transform: translateY(-1px);
}
</style>
