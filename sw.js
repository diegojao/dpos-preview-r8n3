// Dyne POS instalable: abre rápido y aunque la red esté lenta.
// - La página (HTML) se pide SIEMPRE a la red primero, para no quedarse con una versión vieja;
//   solo si no hay red se usa la última guardada.
// - Los archivos con huella (assets/…-abc123.js) no cambian nunca: se guardan y se reutilizan.
// - Los datos (Supabase: órdenes, cobros…) NUNCA se guardan aquí: siempre van en vivo al servidor.
const CACHE = 'dyne-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase y fuentes: directo a la red

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put('pagina', copia))
          return r
        })
        .catch(() => caches.match('pagina')),
    )
    return
  }

  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(req).then((guardado) => guardado || fetch(req).then((r) => {
        if (r.ok) {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put(req, copia))
        }
        return r
      })),
    )
  }
})
