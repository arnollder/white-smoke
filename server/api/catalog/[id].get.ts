export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан товар' })
  }

  const product = await getCatalogProduct(id)
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Товар не найден' })
  }

  return product
})
