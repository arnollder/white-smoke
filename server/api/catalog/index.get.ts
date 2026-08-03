import type { CatalogListResponse } from '#shared/types/catalog'
import { catalogCategories, filterCatalogProducts, getCatalogProducts } from '../../utils/catalog'

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100

export default defineCachedEventHandler(async (event): Promise<CatalogListResponse> => {
  const query = getQuery(event)
  const search = String(query.q || '').trim()
  const category = String(query.category || '').trim()
  const storeSlug = String(query.store || '').trim()
  const inStockOnly = query.inStock === '1' || query.inStock === 'true'
  const all = query.all === '1' || query.all === 'true'

  const pageRaw = Number(query.page || 1)
  const sizeRaw = Number(query.pageSize || DEFAULT_PAGE_SIZE)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const pageSize = all
    ? Number.POSITIVE_INFINITY
    : Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(sizeRaw) ? Math.floor(sizeRaw) : DEFAULT_PAGE_SIZE))

  const force = query.refresh === '1' || query.refresh === 'true'
  const allProducts = await getCatalogProducts({ force })
  const categories = catalogCategories(allProducts)
  const filtered = filterCatalogProducts(allProducts, {
    search,
    category,
    storeSlug,
    inStockOnly
  })

  const total = filtered.length
  const pageCount = pageSize === Number.POSITIVE_INFINITY
    ? 1
    : Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const start = pageSize === Number.POSITIVE_INFINITY ? 0 : (safePage - 1) * pageSize
  const products = pageSize === Number.POSITIVE_INFINITY
    ? filtered
    : filtered.slice(start, start + pageSize)

  return {
    products,
    categories,
    total,
    page: safePage,
    pageSize: pageSize === Number.POSITIVE_INFINITY ? total || DEFAULT_PAGE_SIZE : pageSize,
    pageCount
  }
}, {
  maxAge: 60,
  swr: true,
  staleMaxAge: 600,
  getKey: (event) => {
    const q = getQuery(event)
    return [
      'catalog',
      q.q || '',
      q.category || '',
      q.store || '',
      q.inStock || '',
      q.page || '1',
      q.pageSize || '',
      q.all || '',
      q.refresh || ''
    ].join(':')
  }
})
