// Service worker mínimo: solo existe para que el navegador considere la app
// "instalable" (agregar a pantalla de inicio). No cachea nada — la app
// siempre necesita conexión para hablar con Supabase.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
