export default defineNuxtPlugin(() => {
  const { load } = useCart()
  if (import.meta.client) {
    load()
  }
})
