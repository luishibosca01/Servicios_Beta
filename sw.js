// Service Worker para DeltaF - Offline First
// IMPORTANTE: Incrementa este número CADA VEZ que actualices el index.html
const CACHE_VERSION = 'v0.31';
const CACHE_NAME = `deltaf-${CACHE_VERSION}`;

// Lista de archivos a cachear
// IMPORTANTE: Actualiza 'DeltaF_v0_31.html' con el nombre actual de tu archivo
const urlsToCache = [
  './',
  './index.html',  // ⚠️ CAMBIA ESTO por el nombre de tu archivo HTML
  './manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Instalación completa');
        // NO hacer skipWaiting() aquí - esperar activación manual
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar caches antiguas
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Tomando control de las páginas');
        return self.clients.claim();
      })
      .then(() => {
        // Notificar a los clientes que hay nueva versión
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION
            });
          });
        });
      })
  );
});

// Estrategia CACHE FIRST para modo offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, retornarlo
        if (cachedResponse) {
          console.log('[SW] Sirviendo desde cache:', event.request.url);
          
          // En segundo plano, intentar actualizar el cache
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            })
            .catch(() => {
              // Ignorar errores de red en background
            });
          
          return cachedResponse;
        }
        
        // Si no está en cache, intentar red
        return fetch(event.request)
          .then((response) => {
            // No cachear si no es una respuesta válida
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cachear la respuesta para futuras peticiones
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          })
          .catch(() => {
            // Si falla la red y es navegación, retornar página principal
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');  // ⚠️ CAMBIA ESTO también
            }
            
            return new Response('Offline - Recurso no disponible', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Activación forzada por el usuario');
    self.skipWaiting();
  }
});
