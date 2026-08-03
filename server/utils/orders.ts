import type { FulfillmentType } from '#shared/types/catalog'
import {
  fetchAllPages,
  msFetch,
  msMeta,
  type MsCollection,
  type MsCounterparty,
  type MsCustomerOrder
} from './moysklad'
import { findStoreBySlug, getDeliveryStore, type StoreConfig } from './stores'
import { getCatalogProducts, invalidateCatalogCache } from './catalog'

/** Prefer env org UUID when valid; otherwise first non-archived organization. */
async function resolveOrganizationId(): Promise<string> {
  const config = useRuntimeConfig()
  const fromEnv = String(config.moyskladOrganizationId || '').trim()

  if (fromEnv) {
    try {
      await msFetch(`/entity/organization/${fromEnv}`)
      return fromEnv
    } catch {
      // Stale UUID — fall through to live list
    }
  }

  const orgs = (await fetchAllPages<{ id: string, archived?: boolean }>('/entity/organization', {
    filter: 'archived=false'
  })).filter(o => !o.archived)

  const first = orgs[0]
  if (!first?.id) {
    throw createError({
      statusCode: 503,
      statusMessage: 'В МойСклад нет организации. Задайте MOYSKLAD_ORGANIZATION_ID'
    })
  }
  return first.id
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }
  if (digits.length === 10) {
    return `+7${digits}`
  }
  return phone.trim()
}

async function findOrCreateCounterparty(name: string, phone: string): Promise<string> {
  const normalized = normalizePhone(phone)
  const search = await msFetch<MsCollection<MsCounterparty>>('/entity/counterparty', {
    query: {
      filter: `phone~${normalized}`,
      limit: 1
    }
  })

  if (search.rows[0]?.id) {
    return search.rows[0].id
  }

  // Also try without +
  const digits = normalized.replace(/\D/g, '')
  const search2 = await msFetch<MsCollection<MsCounterparty>>('/entity/counterparty', {
    query: {
      search: digits,
      limit: 5
    }
  })
  const match = search2.rows.find(r => (r.phone || '').replace(/\D/g, '').includes(digits.slice(-10)))
  if (match?.id) return match.id

  const created = await msFetch<MsCounterparty>('/entity/counterparty', {
    method: 'POST',
    body: {
      name: name.trim() || `Клиент ${normalized}`,
      phone: normalized,
      companyType: 'individual'
    }
  })
  return created.id
}

export interface CreateOrderInput {
  items: Array<{ id: string, quantity: number }>
  fulfillment: FulfillmentType
  storeSlug?: string
  name: string
  phone: string
  address?: string
  comment?: string
}

export async function createCustomerOrder(input: CreateOrderInput): Promise<{
  id: string
  name: string
  fulfillment: FulfillmentType
  storeSlug?: string
  message: string
}> {
  const config = useRuntimeConfig()
  if (!config.moyskladToken) {
    // Demo mode: accept order without MS
    const demoId = `demo-${Date.now().toString(36)}`
    return {
      id: demoId,
      name: demoId,
      fulfillment: input.fulfillment,
      storeSlug: input.storeSlug,
      message: input.fulfillment === 'pickup'
        ? 'Демо-резерв создан (МойСклад не подключён).'
        : 'Демо-заявка на доставку создана (МойСклад не подключён).'
    }
  }

  const organizationId = await resolveOrganizationId()

  let store: StoreConfig
  if (input.fulfillment === 'pickup') {
    if (!input.storeSlug) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите магазин для самовывоза' })
    }
    const found = await findStoreBySlug(input.storeSlug)
    if (!found?.msId) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный магазин' })
    }
    store = found
  } else {
    store = await getDeliveryStore()
    if (!store.msId) {
      throw createError({ statusCode: 503, statusMessage: 'Склад для доставки не настроен' })
    }
    if (!input.address?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Укажите адрес доставки в Дзержинске' })
    }
    const addr = input.address.toLowerCase()
    if (!addr.includes('дзержинск') && !addr.includes('dzerzhinsk')) {
      // Soft require city mention or street in city — allow if user skipped city name but we prepend
    }
  }

  if (!input.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Корзина пуста' })
  }

  // Live stocks (net of reserve) — do not trust a stale catalog snapshot at checkout
  const catalog = await getCatalogProducts({ force: true })
  const byId = new Map(catalog.map(p => [p.id, p]))

  const positions: Array<{
    quantity: number
    reserve: number
    assortment: ReturnType<typeof msMeta>
    price: number
  }> = []

  for (const line of input.items) {
    const product = byId.get(line.id)
    if (!product) {
      throw createError({ statusCode: 400, statusMessage: `Товар не найден: ${line.id}` })
    }
    if (line.quantity < 1) {
      throw createError({ statusCode: 400, statusMessage: `Некорректное количество: ${product.name}` })
    }

    const storeStock = product.stocks.find(s => s.storeSlug === store.slug)?.stock ?? 0
    // For delivery, check stock at delivery warehouse
    if (storeStock < line.quantity) {
      throw createError({
        statusCode: 409,
        statusMessage: `Недостаточно «${product.name}» в «${store.name}» (доступно ${storeStock})`
      })
    }

    const type = product.assortmentType || 'product'
    positions.push({
      quantity: line.quantity,
      reserve: line.quantity,
      price: Math.round(product.price * 100),
      assortment: msMeta(type, product.id)
    })
  }

  const agentId = await findOrCreateCounterparty(input.name, input.phone)

  const deliveryAddress = input.fulfillment === 'delivery'
    ? (input.address!.toLowerCase().includes('дзержинск')
        ? input.address!.trim()
        : `г. Дзержинск, ${input.address!.trim()}`)
    : undefined

  const descriptionParts = [
    input.fulfillment === 'pickup' ? `Самовывоз: ${store.name}` : `Доставка по Дзержинску: ${deliveryAddress}`,
    input.comment?.trim() ? `Комментарий: ${input.comment.trim()}` : null,
    `Телефон: ${normalizePhone(input.phone)}`,
    'Оплата при получении'
  ].filter(Boolean)

  try {
    const order = await msFetch<MsCustomerOrder>('/entity/customerorder', {
      method: 'POST',
      body: {
        organization: msMeta('organization', organizationId),
        agent: msMeta('counterparty', agentId),
        store: msMeta('store', store.msId),
        description: descriptionParts.join('\n'),
        shipmentAddress: deliveryAddress,
        positions
      }
    })

    // Reserved qty must leave the storefront immediately
    invalidateCatalogCache()
    void getCatalogProducts({ force: true }).catch(() => {})

    return {
      id: order.id,
      name: order.name,
      fulfillment: input.fulfillment,
      storeSlug: store.slug,
      message: input.fulfillment === 'pickup'
        ? `Резерв ${order.name} оформлен. Заберите заказ в магазине «${store.name}».`
        : `Заявка на доставку ${order.name} принята. Курьер свяжется с вами.`
    }
  } catch (err: unknown) {
    const e = err as { status?: number, message?: string, body?: unknown }
    if (e.status === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'МойСклад временно ограничивает запросы. Подождите несколько секунд и повторите.',
        data: e.body
      })
    }
    throw err
  }
}
