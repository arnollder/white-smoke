export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
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
    moyskladToken: process.env.MOYSKLAD_TOKEN || '',
    moyskladOrganizationId: process.env.MOYSKLAD_ORGANIZATION_ID || '',
    moyskladStore1Id: process.env.MOYSKLAD_STORE_1_ID || '',
    moyskladStore2Id: process.env.MOYSKLAD_STORE_2_ID || '',
    moyskladStore3Id: process.env.MOYSKLAD_STORE_3_ID || '',
    public: {
      siteName: 'White Smoke',
      city: 'Дзержинск'
    }
  },
  app: {
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
  }
})
