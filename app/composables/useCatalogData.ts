import type { CatalogListResponse, CatalogProduct } from '#shared/types/catalog'

export interface CatalogQuery {
  q?: string
  category?: string
  store?: string
  inStock?: boolean
  page?: number
  pageSize?: number
  /** Full list (cart / legacy). Prefer pagination on the shop floor. */
  all?: boolean
  refresh?: boolean
}

/** Paginated catalog — used by the shop floor. */
export function useCatalogPage(query: MaybeRefOrGetter<CatalogQuery>) {
  const params = computed(() => {
    const q = toValue(query)
    return {
      q: q.q || undefined,
      category: q.category || undefined,
      store: q.store || undefined,
      inStock: q.inStock === false ? '0' : '1',
      page: q.page || 1,
      pageSize: q.pageSize || 24,
      ...(q.all ? { all: '1' } : {}),
      ...(q.refresh ? { refresh: '1' } : {})
    }
  })

  return useFetch<CatalogListResponse>('/api/catalog', {
    key: 'catalog-page',
    query: params,
    watch: [params]
  })
}

/**
 * Full catalog payload — cart stock checks & static prerender.
 * Backed by the long server-side MoySklad snapshot cache.
 */
export function useCatalogData() {
  return useFetch<CatalogListResponse>('/api/catalog', {
    key: 'catalog-all',
    query: { all: '1', inStock: '0' }
  })
}

export async function fetchCatalogProduct(idOrSlug: string) {
  return $fetch<CatalogProduct>(`/api/catalog/${idOrSlug}`)
}
