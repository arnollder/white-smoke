import type { CatalogProduct, StoreStock } from '#shared/types/catalog'
import {
  fetchAllPages,
  idFromHref,
  msFetch,
  type MsAssortmentRow,
  type MsImageRow,
  type MsProduct,
  type MsStockByStoreRow
} from './moysklad'
import { getStoreConfigs } from './stores'

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

function buildStocks(stockRow: MsStockByStoreRow | undefined): StoreStock[] {
  const stores = getStoreConfigs().filter(s => s.msId)
  const byId = new Map<string, number>()

  for (const entry of stockRow?.stockByStore || []) {
    const storeId = idFromHref(entry.meta.href)
    // Available = stock - reserve (stock field in bystore is free stock in some docs; use stock as available)
    byId.set(storeId, Math.max(0, entry.stock ?? 0))
  }

  return stores.map((s) => {
    const stock = byId.get(s.msId) ?? 0
    return {
      storeSlug: s.slug,
      storeName: s.name,
      stock
    }
  })
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const stores = getStoreConfigs().filter(s => s.msId)
  const useDemo = !useRuntimeConfig().moyskladToken || stores.length === 0

  if (useDemo) {
    return getDemoCatalog()
  }

  const [assortment, stockRows] = await Promise.all([
    fetchAllPages<MsAssortmentRow>('/entity/assortment', {
      filter: 'archived=false',
      expand: 'productFolder'
    }),
    fetchAllPages<MsStockByStoreRow>('/report/stock/bystore')
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
    const stocks = buildStocks(stockMap.get(id))
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
      stocks,
      totalStock
    })
  }

  return products.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
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
      // try variant
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

function getDemoCatalog(): CatalogProduct[] {
  const stores = getStoreConfigs()
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
      stocks,
      totalStock: stocks.reduce((a, b) => a + b.stock, 0)
    }
  })
}
