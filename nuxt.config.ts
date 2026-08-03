export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },
  /**
   * Bundle Lucide locally — avoids Iconify API fetches and
   * "Collection lucide is not found locally" / failed-to-load warnings.
   */
  icon: {
    serverBundle: {
      collections: ['lucide']
    },
    clientBundle: {
      scan: true,
      // Dynamic UButton `icon=` props are easy for the scanner to miss
      icons: [
        'lucide:arrow-left',
        'lucide:arrow-right',
        'lucide:check',
        'lucide:chevron-down',
        'lucide:chevron-left',
        'lucide:chevron-right',
        'lucide:minus',
        'lucide:package',
        'lucide:phone',
        'lucide:plus',
        'lucide:refresh-cw',
        'lucide:search',
        'lucide:search-x',
        'lucide:shopping-bag',
        'lucide:trash-2'
      ]
    }
  },
  fonts: {
    families: [
      { name: 'Alice', provider: 'google', weights: [400] },
      // Condensed modern display — fits vape/street shop energy, Cyrillic included
      { name: 'Unbounded', provider: 'google', weights: [400, 500, 600, 700] },
      {
        name: 'Agretta Hills Cyrillic',
        provider: 'local',
        weights: [400],
        global: true
      }
    ]
  },
  runtimeConfig: {
    moyskladToken: process.env.MOYSKLAD_TOKEN || process.env.NUXT_MOYSKLAD_TOKEN || '',
    moyskladOrganizationId: process.env.MOYSKLAD_ORGANIZATION_ID || process.env.NUXT_MOYSKLAD_ORGANIZATION_ID || '',
    moyskladStore1Id: process.env.MOYSKLAD_STORE_1_ID || process.env.NUXT_MOYSKLAD_STORE_1_ID || '',
    moyskladStore2Id: process.env.MOYSKLAD_STORE_2_ID || process.env.NUXT_MOYSKLAD_STORE_2_ID || '',
    moyskladStore3Id: process.env.MOYSKLAD_STORE_3_ID || process.env.NUXT_MOYSKLAD_STORE_3_ID || '',
    public: {
      siteName: 'White Smoke',
      city: 'Дзержинск',
      /** GitHub Pages / static hosting — no live Nitro API */
      staticHosting: process.env.NUXT_PUBLIC_STATIC_HOSTING === '1'
    }
  },
  app: {
    // Set NUXT_APP_BASE_URL=/white-smoke/ for project Pages
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'White Smoke — вейп и табак в Дзержинске',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { name: 'description', content: 'White Smoke — витрина вейп и табачной продукции. Три магазина в Дзержинске: резерв самовывоза или доставка по городу.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/catalog', '/stores', '/cart', '/api/catalog?all=1&inStock=0', '/api/stores']
    }
  },
  hooks: {
    async 'prerender:routes'(ctx) {
      try {
        const { getCatalogProducts } = await import('./server/utils/catalog')
        const products = await getCatalogProducts()
        for (const p of products) {
          ctx.routes.add(`/catalog/${p.slug}`)
          ctx.routes.add(`/api/catalog/${p.id}`)
          ctx.routes.add(`/api/catalog/${p.slug}`)
        }
      } catch (err) {
        console.warn('[prerender] catalog routes skipped:', err)
      }
    }
  }
})
