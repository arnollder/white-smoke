import { z } from 'zod'

const bodySchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.number().int().positive()
  })).min(1),
  fulfillment: z.enum(['pickup', 'delivery']),
  storeSlug: z.string().optional(),
  name: z.string().min(2, 'Укажите имя'),
  phone: z.string().min(10, 'Укажите телефон'),
  address: z.string().optional(),
  comment: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.errors[0]?.message || 'Некорректные данные заказа'
    })
  }

  const data = parsed.data
  if (data.fulfillment === 'pickup' && !data.storeSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите магазин' })
  }
  if (data.fulfillment === 'delivery' && !data.address?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Укажите адрес доставки' })
  }

  try {
    return await createCustomerOrder(data)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    const e = err as { message?: string, status?: number }
    throw createError({
      statusCode: e.status || 502,
      statusMessage: e.message || 'Не удалось создать заказ в МойСклад'
    })
  }
})
