import type { PublicStore } from '#shared/types/catalog'
import { fetchAllPages } from './moysklad'

export interface StoreConfig extends PublicStore {
  /** MoySklad store (warehouse) UUID */
  msId: string
}

interface MsStore {
  id: string
  name: string
  address?: string
  archived?: boolean
}

const storeCache = {
  at: 0,
  stores: null as StoreConfig[] | null
}

const CACHE_MS = 60_000

function envStoreSlot(index: 1 | 2 | 3): StoreConfig {
  const config = useRuntimeConfig()
  const msId = index === 1
    ? String(config.moyskladStore1Id || '')
    : index === 2
      ? String(config.moyskladStore2Id || '')
      : String(config.moyskladStore3Id || '')

  return {
    slug: `store-${index}`,
    name: process.env[`STORE_${index}_NAME`] || `Магазин ${index}`,
    address: process.env[`STORE_${index}_ADDRESS`] || 'г. Дзержинск',
    hours: process.env[`STORE_${index}_HOURS`] || 'Ежедневно 10:00–22:00',
    phone: process.env[`STORE_${index}_PHONE`] || '',
    msId: msId.trim()
  }
}

/** Sync config from env (may have empty msId). */
export function getStoreConfigsFromEnv(): StoreConfig[] {
  return [envStoreSlot(1), envStoreSlot(2), envStoreSlot(3)]
}

function normName(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, 'е')
}

/**
 * Resolve up to 3 shop warehouses.
 * Uses MOYSKLAD_STORE_*_ID when set and valid in MoySklad;
 * otherwise matches STORE_*_NAME, then fills from remaining warehouses.
 */
export async function resolveStoreConfigs(): Promise<StoreConfig[]> {
  const now = Date.now()
  if (storeCache.stores && now - storeCache.at < CACHE_MS) {
    return storeCache.stores
  }

  const fromEnv = getStoreConfigsFromEnv()
  const token = useRuntimeConfig().moyskladToken?.trim()

  if (!token) {
    storeCache.stores = fromEnv
    storeCache.at = now
    return fromEnv
  }

  const msStores = (await fetchAllPages<MsStore>('/entity/store', {
    filter: 'archived=false'
  })).filter(s => !s.archived)

  if (!msStores.length) {
    storeCache.stores = fromEnv
    storeCache.at = now
    return fromEnv
  }

  const byId = new Map(msStores.map(s => [s.id, s]))
  const remaining = [...msStores]
  const take = (ms: MsStore | undefined) => {
    if (!ms) return undefined
    const idx = remaining.findIndex(s => s.id === ms.id)
    if (idx >= 0) remaining.splice(idx, 1)
    return ms
  }

  const resolved: StoreConfig[] = fromEnv.map((slot, i) => {
    const index = (i + 1) as 1 | 2 | 3
    const envName = process.env[`STORE_${index}_NAME`]
    const envAddress = process.env[`STORE_${index}_ADDRESS`]
    const envHours = process.env[`STORE_${index}_HOURS`]
    const envPhone = process.env[`STORE_${index}_PHONE`]

    // Prefer valid MoySklad UUID from env
    let ms = slot.msId ? byId.get(slot.msId) : undefined

    // Stale/wrong UUID → match by public name
    if (!ms && envName) {
      const want = normName(envName)
      ms = remaining.find(s => normName(s.name) === want)
        || remaining.find(s => normName(s.name).includes(want) || want.includes(normName(s.name)))
    }

    // Last resort: next unused warehouse
    if (!ms) {
      ms = remaining[0]
    }

    ms = take(ms)
    if (!ms) return { ...slot, msId: '' }

    return {
      slug: slot.slug,
      name: envName || ms.name,
      address: envAddress || ms.address || slot.address,
      hours: envHours || slot.hours,
      phone: envPhone || slot.phone,
      msId: ms.id
    }
  })

  const withIds = resolved.filter(s => s.msId)
  storeCache.stores = withIds.length ? withIds : fromEnv
  storeCache.at = now
  return storeCache.stores
}

export async function getPublicStores(): Promise<PublicStore[]> {
  const stores = await resolveStoreConfigs()
  return stores
    .filter(s => s.msId || !useRuntimeConfig().moyskladToken)
    .map(({ slug, name, address, hours, phone }) => ({
      slug,
      name,
      address,
      hours,
      phone
    }))
}

export async function findStoreBySlug(slug: string): Promise<StoreConfig | undefined> {
  const stores = await resolveStoreConfigs()
  return stores.find(s => s.slug === slug)
}

export async function getDeliveryStore(): Promise<StoreConfig> {
  const stores = await resolveStoreConfigs()
  const withId = stores.find(s => s.msId)
  if (!withId) {
    throw createError({ statusCode: 503, statusMessage: 'Склады МойСклад не настроены' })
  }
  return withId
}

/** @deprecated sync helper — prefer resolveStoreConfigs */
export function getStoreConfigs(): StoreConfig[] {
  return getStoreConfigsFromEnv()
}
