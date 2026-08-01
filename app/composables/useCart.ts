import type { CartItem } from '#shared/types/catalog'

const CART_KEY = 'ws-cart'

export function useCart() {
  const items = useState<CartItem[]>('cart-items', () => [])

  function persist() {
    if (import.meta.client) {
      localStorage.setItem(CART_KEY, JSON.stringify(items.value))
    }
  }

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(CART_KEY)
      if (raw) items.value = JSON.parse(raw) as CartItem[]
    } catch {
      items.value = []
    }
  }

  const cartCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))

  const cartTotal = computed(() =>
    items.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
  )

  function addItem(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    const existing = items.value.find(i => i.id === item.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({ ...item, quantity })
    }
    persist()
  }

  function setQuantity(id: string, quantity: number) {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx === -1) return
    if (quantity <= 0) {
      items.value.splice(idx, 1)
    } else {
      items.value[idx]!.quantity = quantity
    }
    persist()
  }

  function removeItem(id: string) {
    items.value = items.value.filter(i => i.id !== id)
    persist()
  }

  function clearCart() {
    items.value = []
    persist()
  }

  return {
    items,
    cartCount,
    cartTotal,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    load
  }
}
