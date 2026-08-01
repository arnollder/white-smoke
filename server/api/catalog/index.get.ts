export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.q || '').trim().toLowerCase()
  const category = String(query.category || '').trim()
  const storeSlug = String(query.store || '').trim()
  const inStockOnly = query.inStock === '1' || query.inStock === 'true'

  let products = await getCatalogProducts()

  if (category) {
    products = products.filter(p => p.category === category)
  }

  if (storeSlug) {
    products = products.filter((p) => {
      const s = p.stocks.find(x => x.storeSlug === storeSlug)
      return (s?.stock ?? 0) > 0
    })
  } else if (inStockOnly) {
    products = products.filter(p => p.totalStock > 0)
  }

  if (search) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(search)
      || p.article.toLowerCase().includes(search)
      || (p.description || '').toLowerCase().includes(search)
    )
  }

  const categories = [...new Set(
    (await getCatalogProducts()).map(p => p.category).filter(Boolean) as string[]
  )].sort((a, b) => a.localeCompare(b, 'ru'))

  return {
    products,
    categories,
    total: products.length
  }
}, {
  maxAge: 45,
  getKey: (event) => {
    const q = getQuery(event)
    return `catalog:${q.q || ''}:${q.category || ''}:${q.store || ''}:${q.inStock || ''}`
  }
})
