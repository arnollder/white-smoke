import type { CatalogProduct, StoreStock } from '#shared/types/catalog'
import {
  fetchAllPages,
  idFromHref,
  msFetch,
  MoySkladError,
  type MsAssortmentRow,
  type MsImageRow,
  type MsProduct,
  type MsStockByStoreRow
} from './moysklad'
import { resolveStoreConfigs, type StoreConfig } from './stores'

const catalogCache = {
  at: 0,
  products: null as CatalogProduct[] | null,
  refreshing: false
}

/** Serve as fresh for this long. */
const CATALOG_FRESH_MS = 10 * 60_000
/** After fresh window, still serve snapshot while a background refresh runs. */
const CATALOG_STALE_MS = 30 * 60_000

function priceFromProduct(p: MsProduct | MsAssortmentRow): number {
  const value = p.salePrices?.[0]?.value
  if (value == null) return 0
  return value / 100
}

function slugify(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${base || 'item'}-${id.slice(0, 8)}`
}

function categoryFromProduct(p: MsProduct | MsAssortmentRow): string | null {
  if (p.pathName) {
    const parts = p.pathName.split('/')
    return parts[parts.length - 1] || p.pathName
  }
  return p.productFolder?.name || null
}

function buildStocks(stockRow: MsStockByStoreRow | undefined, stores: StoreConfig[]): StoreStock[] {
  const byId = new Map<string, number>()

  for (const entry of stockRow?.stockByStore || []) {
    const storeId = idFromHref(entry.meta.href)
    // report/stock/bystore.stock = доступно (без резерва)
    byId.set(storeId, Math.max(0, Math.floor(entry.stock ?? 0)))
  }

  return stores.map((s) => ({
    storeSlug: s.slug,
    storeName: s.name,
    stock: s.msId ? (byId.get(s.msId) ?? 0) : 0
  }))
}

async function loadCatalogFromMoySklad(): Promise<CatalogProduct[]> {
  const stores = (await resolveStoreConfigs()).filter(s => s.msId)
  if (!stores.length) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Не найдены склады в МойСклад. Проверьте токен или MOYSKLAD_STORE_*_ID'
    })
  }

  // limit=1000 → fewer round-trips; pathName covers category without expand
  const [assortment, stockRows] = await Promise.all([
    fetchAllPages<MsAssortmentRow>('/entity/assortment', {
      filter: 'archived=false'
    }, 1000),
    fetchAllPages<MsStockByStoreRow>('/report/stock/bystore', {}, 1000)
  ])

  const stockMap = new Map<string, MsStockByStoreRow>()
  for (const row of stockRows) {
    stockMap.set(idFromHref(row.meta.href), row)
  }

  const products: CatalogProduct[] = []

  for (const row of assortment) {
    if (row.archived) continue
    const type = row.meta?.type
    if (type !== 'product' && type !== 'variant') continue

    const id = row.id
    const stocks = buildStocks(stockMap.get(id), stores)
    const totalStock = stocks.reduce((s, x) => s + x.stock, 0)
    const hasImage = (row.images?.meta?.size ?? 0) > 0

    products.push({
      id,
      slug: slugify(row.name, id),
      name: row.name,
      description: row.description || '',
      article: row.article || row.code || '',
      price: priceFromProduct(row),
      currency: 'RUB',
      imageUrl: hasImage ? `/api/catalog/image/${id}` : null,
      category: categoryFromProduct(row),
      assortmentType: type,
      stocks,
      totalStock
    })
  }

  return products.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

function scheduleCatalogRefresh() {
  if (catalogCache.refreshing) return
  catalogCache.refreshing = true
  loadCatalogFromMoySklad()
    .then((products) => {
      catalogCache.products = products
      catalogCache.at = Date.now()
    })
    .catch(() => {
      // Keep serving the previous snapshot on background failure
    })
    .finally(() => {
      catalogCache.refreshing = false
    })
}

export async function getCatalogProducts(options: { force?: boolean } = {}): Promise<CatalogProduct[]> {
  const token = useRuntimeConfig().moyskladToken?.trim()
  if (!token) {
    return getDemoCatalog(await resolveStoreConfigs())
  }

  const now = Date.now()
  const age = catalogCache.products ? now - catalogCache.at : Infinity

  if (!options.force && catalogCache.products) {
    if (age < CATALOG_FRESH_MS) {
      return catalogCache.products
    }
    if (age < CATALOG_STALE_MS) {
      scheduleCatalogRefresh()
      return catalogCache.products
    }
  }

  try {
    const products = await loadCatalogFromMoySklad()
    catalogCache.products = products
    catalogCache.at = Date.now()
    return products
  } catch (err: unknown) {
    // Hard failure but we still have a snapshot — keep the shop up
    if (catalogCache.products) {
      scheduleCatalogRefresh()
      return catalogCache.products
    }
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    const e = err as MoySkladError
    const status = e.status || 502
    throw createError({
      statusCode: status,
      statusMessage: status === 429
        ? 'МойСклад временно ограничивает запросы. Подождите несколько секунд и повторите.'
        : (e.message || 'Не удалось загрузить витрину из МойСклад'),
      data: e.body
    })
  }
}

export function filterCatalogProducts(
  products: CatalogProduct[],
  opts: {
    search?: string
    category?: string
    storeSlug?: string
    inStockOnly?: boolean
  }
): CatalogProduct[] {
  let list = products
  const search = opts.search?.trim().toLowerCase() || ''
  const category = opts.category?.trim() || ''
  const storeSlug = opts.storeSlug?.trim() || ''

  if (category) {
    list = list.filter(p => p.category === category)
  }

  if (storeSlug) {
    list = list.filter((p) => {
      const s = p.stocks.find(x => x.storeSlug === storeSlug)
      return (s?.stock ?? 0) > 0
    })
  } else if (opts.inStockOnly) {
    list = list.filter(p => p.totalStock > 0)
  }

  if (search) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(search)
      || p.article.toLowerCase().includes(search)
      || (p.description || '').toLowerCase().includes(search)
    )
  }

  return list
}

export function catalogCategories(products: CatalogProduct[]): string[] {
  return [...new Set(
    products.map(p => p.category).filter(Boolean) as string[]
  )].sort((a, b) => a.localeCompare(b, 'ru'))
}

export async function getCatalogProduct(idOrSlug: string): Promise<CatalogProduct | null> {
  const all = await getCatalogProducts()
  return all.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null
}

export async function getProductImageBuffer(productId: string): Promise<{ data: ArrayBuffer, contentType: string } | null> {
  try {
    const product = await msFetch<MsProduct>(`/entity/product/${productId}`, {
      query: { expand: 'images' }
    })
    const href = product.images?.meta?.href
    if (!href) {
      const variant = await msFetch<MsProduct>(`/entity/variant/${productId}`).catch(() => null)
      if (!variant?.images?.meta?.href) return null
      return downloadFirstImage(variant.images.meta.href)
    }
    return downloadFirstImage(href)
  } catch {
    return null
  }
}

async function downloadFirstImage(imagesHref: string): Promise<{ data: ArrayBuffer, contentType: string } | null> {
  const path = imagesHref.replace('https://api.moysklad.ru/api/remap/1.2', '')
  const images = await msFetch<{ rows: MsImageRow[] }>(path)
  const first = images.rows?.[0]
  const downloadHref = first?.meta?.downloadHref || first?.miniature?.href
  if (!downloadHref) return null

  const token = useRuntimeConfig().moyskladToken
  const data = await $fetch.raw(downloadHref, {
    responseType: 'arrayBuffer',
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept-Encoding': 'gzip'
    }
  })

  return {
    data: data._data as ArrayBuffer,
    contentType: data.headers.get('content-type') || 'image/jpeg'
  }
}

function getDemoCatalog(stores: StoreConfig[]): CatalogProduct[] {
  const demo = [
    { name: 'Жидкость Classic Tobacco 30 мл', category: 'Жидкости', price: 890, s: [12, 4, 0] },
    { name: 'Под-система Compact Pro', category: 'Устройства', price: 2490, s: [3, 5, 2] },
    { name: 'Картридж 2 мл (2 шт)', category: 'Расходники', price: 590, s: [20, 15, 8] },
    { name: 'Сигариллы Mild', category: 'Табак', price: 320, s: [0, 10, 6] },
    { name: 'Одноразка Ice Mint 6000', category: 'Одноразки', price: 990, s: [7, 0, 11] },
    { name: 'Никотиновые подушечки Mint', category: 'Подушечки', price: 450, s: [14, 9, 3] }
  ]

  return demo.map((d, i) => {
    const id = `demo-${i + 1}`
    const stocks: StoreStock[] = stores.map((store, si) => ({
      storeSlug: store.slug,
      storeName: store.name,
      stock: d.s[si] ?? 0
    }))
    return {
      id,
      slug: slugify(d.name, id),
      name: d.name,
      description: 'Демо-товар. Подключите МойСклад — здесь появятся реальные позиции и остатки.',
      article: `WS-DEMO-${i + 1}`,
      price: d.price,
      currency: 'RUB',
      imageUrl: null,
      category: d.category,
      assortmentType: 'product' as const,
      stocks,
      totalStock: stocks.reduce((a, b) => a + b.stock, 0)
    }
  })
}
