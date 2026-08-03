const MS_BASE = 'https://api.moysklad.ru/api/remap/1.2'

export class MoySkladError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'MoySkladError'
    this.status = status
    this.body = body
  }
}

function getToken(): string {
  const token = useRuntimeConfig().moyskladToken
  if (!token) {
    throw createError({
      statusCode: 503,
      statusMessage: 'МойСклад не настроен: задайте MOYSKLAD_TOKEN'
    })
  }
  return token
}

function msErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const errors = (data as { errors?: Array<{ error?: string, parameter?: string, code?: number }> }).errors
  if (!Array.isArray(errors) || !errors.length) return fallback
  return errors
    .map((item) => {
      const parts = [item.error, item.parameter ? `(${item.parameter})` : null].filter(Boolean)
      return parts.join(' ')
    })
    .join('; ') || fallback
}

export async function msFetch<T>(
  path: string,
  options: {
    method?: string
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
    retries?: number
  } = {}
): Promise<T> {
  const token = getToken()
  const url = path.startsWith('http') ? path : `${MS_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const retries = options.retries ?? 2

  let lastError: MoySkladError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await $fetch<T>(url, {
        method: (options.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE',
        query: options.query,
        body: options.body as Record<string, unknown> | undefined,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;charset=utf-8',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip'
        }
      })
    } catch (err: unknown) {
      const e = err as { statusCode?: number, statusMessage?: string, data?: unknown, message?: string }
      const fallback = e.statusMessage && e.statusMessage !== 'Bad Request'
        ? e.statusMessage
        : (e.message || 'Ошибка МойСклад API')
      lastError = new MoySkladError(
        msErrorMessage(e.data, fallback),
        e.statusCode || 502,
        e.data
      )

      if (lastError.status === 429 && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)))
        continue
      }
      throw lastError
    }
  }

  throw lastError || new MoySkladError('Ошибка МойСклад API', 502)
}

export function msMeta(type: string, id: string) {
  return {
    meta: {
      href: `${MS_BASE}/entity/${type}/${id}`,
      type,
      mediaType: 'application/json'
    }
  }
}

export function msHref(type: string, id: string) {
  return `${MS_BASE}/entity/${type}/${id}`
}

export interface MsCollection<T> {
  meta: { size: number, limit: number, offset: number }
  rows: T[]
}

export interface MsProduct {
  id: string
  name: string
  description?: string
  article?: string
  code?: string
  pathName?: string
  archived?: boolean
  salePrices?: Array<{ value: number, currency?: { meta: { href: string } } }>
  images?: { meta: { href: string, size: number } }
  productFolder?: { meta: { href: string }, name?: string }
  meta: { href: string, type: string, uuidHref?: string }
}

export interface MsAssortmentRow extends MsProduct {
  stock?: number
  reserve?: number
  quantity?: number
}

export interface MsStockByStoreRow {
  meta: { href: string, type: string }
  stockByStore: Array<{
    meta: { href: string, type: string }
    name: string
    stock: number
    reserve: number
    inTransit: number
  }>
}

export interface MsImageRow {
  id: string
  miniature?: { href: string }
  tiny?: { href: string }
  meta: { downloadHref?: string, href: string }
}

export interface MsCounterparty {
  id: string
  name: string
  phone?: string
}

export interface MsCustomerOrder {
  id: string
  name: string
  meta: { href: string }
}

/** Extract UUID from MoySklad href. */
export function idFromHref(href: string): string {
  const clean = (href.split('?')[0] || href).replace(/\/$/, '')
  const parts = clean.split('/').filter(Boolean)
  return parts[parts.length - 1] || href
}

export async function fetchAllPages<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
  limit = 100
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  let size = Infinity

  while (offset < size) {
    const page = await msFetch<MsCollection<T>>(path, {
      query: { ...query, limit, offset }
    })
    rows.push(...page.rows)
    size = page.meta.size
    offset += page.meta.limit
    if (page.rows.length === 0) break
  }

  return rows
}
