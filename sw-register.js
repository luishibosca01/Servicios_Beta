// Registro del Service Worker y manejo de actualizaciones
// Este script debe incluirse en tu index.html antes del cierre del </body>

(function() {
  'use strict';

  // Verificar si el navegador soporta Service Workers
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }

  function registerServiceWorker() {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registrado:', registration);

        // Verificar actualizaciones cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);

        // Detectar cuando hay un nuevo Service Worker esperando
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[App] Nueva versión encontrada, instalando...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              console.log('[App] Nueva versión lista');
              showUpdateNotification(newWorker);
            }
          });
        });
      })
      .catch((error) => {
        console.error('[App] Error al registrar Service Worker:', error);
      });

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[App] Service Worker actualizado a versión:', event.data.version);
        showUpdateNotification();
      }
    });

    // Detectar cuando se toma control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[App] Nuevo Service Worker tomó control');
    });
  }

  function showUpdateNotification(worker) {
    // Crear el toast de notificación
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        max-width: 90%;
        animation: slideUp 0.3s ease-out;
      ">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">✨ Nueva versión disponible</div>
          <div style="opacity: 0.9; font-size: 13px;">Recarga la página para actualizar</div>
        </div>
        <button id="reload-button" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
          white-space: nowrap;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Recargar
        </button>
        <button id="close-toast" style="
          background: transparent;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='1'" 
           onmouseout="this.style.opacity='0.7'">
          ×
        </button>
      </div>
    `;

    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        to {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Agregar al DOM
    document.body.appendChild(toast);

    // Función para recargar
    const reloadButton = document.getElementById('reload-button');
    reloadButton.addEventListener('click', () => {
      if (worker) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });

    // Función para cerrar
    const closeButton = document.getElementById('close-toast');
    closeButton.addEventListener('click', () => {
      const toastElement = document.getElementById('update-toast');
      if (toastElement) {
        toastElement.firstElementChild.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
          toastElement.remove();
        }, 300);
      }
    });

    // Auto-cerrar después de 30 segundos si no se interactúa
    setTimeout(() => {
      const toastElement = document.getElementById('update-toast');
      if (toastElement) {
        toastElement.firstElementChild.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
          toastElement.remove();
        }, 300);
      }
    }, 30000);
  }
})();
