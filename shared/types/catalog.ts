export interface StoreStock {
  storeSlug: string
  storeName: string
  stock: number
}

export interface CatalogProduct {
  id: string
  slug: string
  name: string
  description: string
  article: string
  price: number
  currency: string
  imageUrl: string | null
  category: string | null
  assortmentType: 'product' | 'variant'
  stocks: StoreStock[]
  totalStock: number
}

export interface PublicStore {
  slug: string
  name: string
  address: string
  hours: string
  phone: string
}

export interface CartItem {
  id: string
  slug: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export type FulfillmentType = 'pickup' | 'delivery'

export interface OrderRequest {
  items: Array<{ id: string, quantity: number }>
  fulfillment: FulfillmentType
  storeSlug?: string
  name: string
  phone: string
  address?: string
  comment?: string
}

export interface OrderResponse {
  id: string
  name: string
  fulfillment: FulfillmentType
  storeSlug?: string
  message: string
}

export interface CatalogListResponse {
  products: CatalogProduct[]
  categories: string[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}
