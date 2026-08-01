import type { FulfillmentType } from '#shared/types/catalog'
import {
  msFetch,
  msMeta,
  type MsCollection,
  type MsCounterparty,
  type MsCustomerOrder
} from './moysklad'
import { findStoreBySlug, getDeliveryStore, type StoreConfig } from './stores'
import { getCatalogProducts } from './catalog'

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

  if (!config.moyskladOrganizationId) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Задайте MOYSKLAD_ORGANIZATION_ID'
    })
  }

  let store: StoreConfig
  if (input.fulfillment === 'pickup') {
    if (!input.storeSlug) {
      throw createError({ statusCode: 400, statusMessage: 'Выберите магазин для самовывоза' })
    }
    const found = findStoreBySlug(input.storeSlug)
    if (!found?.msId) {
      throw createError({ statusCode: 400, statusMessage: 'Неизвестный магазин' })
    }
    store = found
  } else {
    store = getDeliveryStore()
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

  const catalog = await getCatalogProducts()
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

    const type = await resolveAssortmentType(product.id)
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

  const order = await msFetch<MsCustomerOrder>('/entity/customerorder', {
    method: 'POST',
    body: {
      organization: msMeta('organization', config.moyskladOrganizationId),
      agent: msMeta('counterparty', agentId),
      store: msMeta('store', store.msId),
      description: descriptionParts.join('\n'),
      shipmentAddress: deliveryAddress,
      positions
    }
  })

  return {
    id: order.id,
    name: order.name,
    fulfillment: input.fulfillment,
    storeSlug: store.slug,
    message: input.fulfillment === 'pickup'
      ? `Резерв ${order.name} оформлен. Заберите заказ в магазине «${store.name}».`
      : `Заявка на доставку ${order.name} принята. Курьер свяжется с вами.`
  }
}

async function resolveAssortmentType(id: string): Promise<'product' | 'variant'> {
  try {
    await msFetch(`/entity/product/${id}`)
    return 'product'
  } catch {
    return 'variant'
  }
}
