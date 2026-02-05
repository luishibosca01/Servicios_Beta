// Service Worker para DeltaF - Offline First
// ⚠️ IMPORTANTE: Incrementa este número CADA VEZ que actualices el index.html
const CACHE_VERSION = 'v0.41';
const CACHE_NAME = `deltaf-${CACHE_VERSION}`;

// Lista de archivos a cachear
const urlsToCache = [
  './',
  './index.html',  // Tu archivo principal (que renombras de DeltaF_vX_XX.html)
  './manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 📦 Cacheando archivos con versión:', CACHE_VERSION);
        // Agregar timestamp para forzar descarga fresca
        const urlsWithVersion = urlsToCache.map(url => {
          if (url.includes('.html')) {
            return `${url}?v=${CACHE_VERSION}`;
          }
          return url;
        });
        return cache.addAll(urlsWithVersion);
      })
      .then(() => {
        console.log('[SW] ✅ Instalación completa');
        // NO hacer skipWaiting() aquí - esperar confirmación del usuario
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar TODAS las caches antiguas que no coincidan con la versión actual
        const deletePromises = cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 🗑️  Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        });
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] 👑 Tomando control de las páginas');
        return self.clients.claim();
      })
      .then(() => {
        // Notificar a todos los clientes activos
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_VERSION,
              timestamp: Date.now()
            });
          });
        });
      })
  );
});

// Estrategia CACHE FIRST con validación de versión
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo cachear recursos del mismo origen
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.match(event.request)
          .then((cachedResponse) => {
            // Si está en cache, retornarlo inmediatamente
            if (cachedResponse) {
              console.log('[SW] 📂 Sirviendo desde cache:', event.request.url);
              
              // En segundo plano, verificar si hay actualizaciones
              // (pero no esperar por ellas)
              fetch(event.request)
                .then((networkResponse) => {
                  if (networkResponse && networkResponse.status === 200) {
                    cache.put(event.request, networkResponse.clone());
                  }
                })
                .catch(() => {
                  // Ignorar errores de red en background
                });
              
              return cachedResponse;
            }
            
            // Si no está en cache, intentar red
            console.log('[SW] 🌐 Descargando desde red:', event.request.url);
            return fetch(event.request)
              .then((networkResponse) => {
                // Cachear respuesta válida
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
              })
              .catch((error) => {
                console.error('[SW] ❌ Error de red:', event.request.url);
                
                // Si es navegación y falla, intentar servir index.html del cache
                if (event.request.mode === 'navigate') {
                  return cache.match('./index.html')
                    .then((fallbackResponse) => {
                      if (fallbackResponse) {
                        return fallbackResponse;
                      }
                      throw error;
                    });
                }
                
                throw error;
              });
          });
      })
  );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('[SW] 📨 Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] ⚡ Activación forzada por el usuario');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
});
