import type { PublicStore } from '#shared/types/catalog'

export interface StoreConfig extends PublicStore {
  /** MoySklad store (warehouse) UUID */
  msId: string
}

export function getStoreConfigs(): StoreConfig[] {
  const config = useRuntimeConfig()

  return [
    {
      slug: 'store-1',
      name: process.env.STORE_1_NAME || 'White Smoke — Центр',
      address: process.env.STORE_1_ADDRESS || 'г. Дзержинск, ул. Примерная, 1',
      hours: process.env.STORE_1_HOURS || 'Ежедневно 10:00–22:00',
      phone: process.env.STORE_1_PHONE || '',
      msId: config.moyskladStore1Id
    },
    {
      slug: 'store-2',
      name: process.env.STORE_2_NAME || 'White Smoke — Север',
      address: process.env.STORE_2_ADDRESS || 'г. Дзержинск, ул. Примерная, 2',
      hours: process.env.STORE_2_HOURS || 'Ежедневно 10:00–22:00',
      phone: process.env.STORE_2_PHONE || '',
      msId: config.moyskladStore2Id
    },
    {
      slug: 'store-3',
      name: process.env.STORE_3_NAME || 'White Smoke — Юг',
      address: process.env.STORE_3_ADDRESS || 'г. Дзержинск, ул. Примерная, 3',
      hours: process.env.STORE_3_HOURS || 'Ежедневно 10:00–22:00',
      phone: process.env.STORE_3_PHONE || '',
      msId: config.moyskladStore3Id
    }
  ]
}

export function getPublicStores(): PublicStore[] {
  return getStoreConfigs().map(({ slug, name, address, hours, phone }) => ({
    slug,
    name,
    address,
    hours,
    phone
  }))
}

export function findStoreBySlug(slug: string): StoreConfig | undefined {
  return getStoreConfigs().find(s => s.slug === slug)
}

export function findStoreByMsId(msId: string): StoreConfig | undefined {
  return getStoreConfigs().find(s => s.msId === msId)
}

/** Default warehouse for city delivery (store-1). */
export function getDeliveryStore(): StoreConfig {
  const stores = getStoreConfigs()
  return stores[0]!
}
