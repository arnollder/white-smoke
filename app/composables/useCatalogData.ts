import type { CatalogProduct } from '#shared/types/catalog'

/** Full catalog payload — shared across pages (works with static prerender payload). */
export function useCatalogData() {
  return useFetch<{
    products: CatalogProduct[]
    categories: string[]
    total: number
  }>('/api/catalog', {
    key: 'catalog-all'
  })
}
