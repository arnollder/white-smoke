export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан товар' })
  }

  const image = await getProductImageBuffer(id)
  if (!image) {
    throw createError({ statusCode: 404, statusMessage: 'Изображение не найдено' })
  }

  setHeader(event, 'Content-Type', image.contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  return image.data
})
