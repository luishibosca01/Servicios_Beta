// sw.js

// CAMBIA ESTO PARA ACTUALIZAR (Ej: v1.22)
const CACHE_NAME = 'deltaF-v0.78-v2-cache'; 

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Instalación: FORZAMOS la descarga de la red ignorando la caché HTTP del navegador
self.addEventListener('install', event => {
  console.log('📦 SW: Instalando nueva versión...');
  
  // Esta línea fuerza al SW a tomar el control inmediatamente sin esperar
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ SW: Cache abierto:', CACHE_NAME);
        
        // Transformamos las URLs en Requests con { cache: 'reload' }
        // Esto es la clave para que baje la versión nueva de GitHub Pages
        const cacheRequests = urlsToCache.map(url => {
          return new Request(url, { cache: 'reload' });
        });

        return cache.addAll(cacheRequests);
      })
      .catch(err => {
        console.error('❌ SW: Error cacheando archivos críticos:', err);
      })
  );
});

// Activación: Limpieza de cachés viejas
self.addEventListener('activate', event => {
  console.log('🔄 SW: Activando y limpiando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ SW: Borrando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Reclama el control de los clientes inmediatamente
  return self.clients.claim();
});

// Fetch: Estrategia Cache-First, cayendo a red si falla
self.addEventListener('fetch', event => {
  // Solo interceptamos peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Si está en cache, lo devolvemos (velocidad offline)
        if (response) {
          return response;
        }

        // 2. Si no, vamos a la red
        return fetch(event.request)
          .then(networkResponse => {
            // Verificamos respuesta válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 3. Guardamos lo nuevo en cache para la próxima (Dynamic Caching)
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });

            return networkResponse;
          })
          .catch(() => {
            // 4. Fallback si no hay red y no está en caché (ej: navegación)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Escuchar mensajes (aunque con skipWaiting en install ya no es estrictamente necesario, se deja por compatibilidad)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
