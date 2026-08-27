const CACHE_NAME = 'club-domino-v5';

const urlsToCache = [
    './',
    './index.html',
    './apunte.html',
    './mesa.html',
    './perfil.html',
    './galardones.html',
    './admin.html',
    './historial.html',
    './consultas.html',
    './logo.png',
    './manifest.json'
];

/*
 * ============================================================
 * INSTALACIÓN
 * ============================================================
 */

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Creando caché:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Instalación completada');
                return self.skipWaiting();
            })
    );
});


/*
 * ============================================================
 * ACTIVACIÓN
 * ============================================================
 */

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => {
                            console.log('[SW] Eliminando caché antigua:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activación completada');
                return self.clients.claim();
            })
    );
});


/*
 * ============================================================
 * PETICIONES
 *
 * IMPORTANTE:
 * - Nunca interceptamos Supabase.
 * - Las páginas HTML usan NETWORK FIRST.
 * - Los demás recursos usan CACHE FIRST.
 * ============================================================
 */

self.addEventListener('fetch', event => {

    const request = event.request;
    const url = new URL(request.url);

    /*
     * No tocar:
     * - POST
     * - PUT
     * - PATCH
     * - DELETE
     * - Supabase
     *
     * Estas peticiones deben ir directamente a internet.
     */

    if (
        request.method !== 'GET' ||
        url.hostname.includes('supabase.co')
    ) {
        return;
    }


    /*
     * ========================================================
     * ARCHIVOS HTML
     *
     * NETWORK FIRST
     *
     * Primero buscamos la versión actual en internet.
     * Si no hay conexión usamos la versión de caché.
     *
     * Esto evita que la aplicación siga usando un HTML viejo.
     * ========================================================
     */

    const esHTML =
        request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/');

    if (esHTML) {

        event.respondWith(

            fetch(request)
                .then(networkResponse => {

                    /*
                     * Guardamos la versión nueva
                     * solamente si la respuesta es correcta.
                     */

                    if (
                        networkResponse &&
                        networkResponse.ok
                    ) {

                        const copia =
                            networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, copia);
                            });

                    }

                    return networkResponse;
                })

                .catch(() => {

                    /*
                     * SIN INTERNET:
                     * utilizamos la última versión disponible.
                     */

                    return caches.match(request)
                        .then(cachedResponse => {

                            if (cachedResponse) {
                                return cachedResponse;
                            }

                            /*
                             * Si no existe ni red ni caché,
                             * dejamos que falle normalmente.
                             */

                            return new Response(
                                'Sin conexión',
                                {
                                    status: 503,
                                    statusText: 'Offline',
                                    headers: {
                                        'Content-Type':
                                            'text/plain; charset=utf-8'
                                    }
                                }
                            );

                        });

                })
        );

        return;
    }


    /*
     * ========================================================
     * RECURSOS ESTÁTICOS
     *
     * CACHE FIRST
     *
     * Ideal para:
     * - imágenes
     * - iconos
     * - CSS
     * - fuentes
     * etc.
     * ========================================================
     */

    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                if (cachedResponse) {

                    /*
                     * Devolvemos inmediatamente la caché
                     * y actualizamos silenciosamente.
                     */

                    event.waitUntil(

                        fetch(request)
                            .then(networkResponse => {

                                if (
                                    networkResponse &&
                                    networkResponse.ok
                                ) {

                                    return caches.open(CACHE_NAME)
                                        .then(cache => {
                                            return cache.put(
                                                request,
                                                networkResponse.clone()
                                            );
                                        });

                                }

                            })
                            .catch(() => {
                                /*
                                 * Sin internet:
                                 * mantenemos la caché.
                                 */
                            })

                    );

                    return cachedResponse;
                }


                /*
                 * No está en caché:
                 * intentar red.
                 */

                return fetch(request);

            })
    );

});