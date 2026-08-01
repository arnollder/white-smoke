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
    msId
  }
}

/** Sync config from env (may have empty msId). */
export function getStoreConfigsFromEnv(): StoreConfig[] {
  return [envStoreSlot(1), envStoreSlot(2), envStoreSlot(3)]
}

/**
 * Resolve up to 3 shop warehouses.
 * Uses MOYSKLAD_STORE_*_ID when set; otherwise loads stores from MoySklad.
 */
export async function resolveStoreConfigs(): Promise<StoreConfig[]> {
  const now = Date.now()
  if (storeCache.stores && now - storeCache.at < CACHE_MS) {
    return storeCache.stores
  }

  const fromEnv = getStoreConfigsFromEnv()
  const configured = fromEnv.filter(s => s.msId)

  if (configured.length === 3) {
    storeCache.stores = fromEnv
    storeCache.at = now
    return fromEnv
  }

  const token = useRuntimeConfig().moyskladToken
  if (!token) {
    storeCache.stores = fromEnv
    storeCache.at = now
    return fromEnv
  }

  const msStores = (await fetchAllPages<MsStore>('/entity/store', {
    filter: 'archived=false'
  })).filter(s => !s.archived)

  // Keep env order when IDs set; fill gaps from MS by name match then remaining
  const used = new Set(configured.map(s => s.msId))
  const remaining = msStores.filter(s => !used.has(s.id))

  const resolved: StoreConfig[] = fromEnv.map((slot, i) => {
    if (slot.msId) {
      const ms = msStores.find(s => s.id === slot.msId)
      return {
        ...slot,
        name: process.env[`STORE_${i + 1}_NAME`] || ms?.name || slot.name,
        address: process.env[`STORE_${i + 1}_ADDRESS`] || ms?.address || slot.address
      }
    }

    const byName = remaining.find(s =>
      s.name.toLowerCase() === slot.name.toLowerCase()
    )
    const pick = byName || remaining.shift()
    if (byName) {
      const idx = remaining.indexOf(byName)
      if (idx >= 0) remaining.splice(idx, 1)
    }

    if (!pick) return slot

    return {
      ...slot,
      msId: pick.id,
      name: process.env[`STORE_${i + 1}_NAME`] || pick.name,
      address: process.env[`STORE_${i + 1}_ADDRESS`] || pick.address || slot.address
    }
  })

  // If still empty slots but MS has stores, assign first 3 MS stores
  const withIds = resolved.filter(s => s.msId)
  if (withIds.length === 0 && msStores.length > 0) {
    const filled = msStores.slice(0, 3).map((s, i) => ({
      slug: `store-${i + 1}`,
      name: process.env[`STORE_${i + 1}_NAME`] || s.name,
      address: process.env[`STORE_${i + 1}_ADDRESS`] || s.address || 'г. Дзержинск',
      hours: process.env[`STORE_${i + 1}_HOURS`] || 'Ежедневно 10:00–22:00',
      phone: process.env[`STORE_${i + 1}_PHONE`] || '',
      msId: s.id
    }))
    storeCache.stores = filled
    storeCache.at = now
    return filled
  }

  storeCache.stores = resolved.filter(s => s.msId).length
    ? resolved
    : fromEnv
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
