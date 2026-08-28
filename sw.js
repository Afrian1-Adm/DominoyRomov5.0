const CACHE_NAME = 'club-domino-v25';

const urlsToCache = [
    './',
    './index.html',
    './login.html',
    './lobby.html',
    './apunte.html',
    './mesa.html',
    './perfil.html',
    './galardones.html',
    './admin.html',
    './historial.html',
    './consultas.html',
    './torneos.html',
    './logo.png',
    './manifest.json',
    './cache.js'
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

                console.log(
                    '[SW] Creando caché:',
                    CACHE_NAME
                );

                return cache.addAll(urlsToCache);

            })
            .then(() => {

                console.log(
                    '[SW] Instalación completada'
                );

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
                        .filter(
                            cacheName =>
                                cacheName !== CACHE_NAME
                        )
                        .map(cacheName => {

                            console.log(
                                '[SW] Eliminando caché antigua:',
                                cacheName
                            );

                            return caches.delete(
                                cacheName
                            );

                        })

                );

            })
            .then(() => {

                console.log(
                    '[SW] Activación completada'
                );

                return self.clients.claim();

            })

    );

});


/*
 * ============================================================
 * PETICIONES
 *
 * IMPORTANTE:
 *
 * 1. Nunca interceptamos Supabase.
 * 2. Nunca interceptamos POST/PUT/PATCH/DELETE.
 * 3. HTML = NETWORK FIRST.
 * 4. Recursos estáticos = CACHE FIRST.
 * ============================================================
 */

self.addEventListener('fetch', event => {

    const request = event.request;
    const url = new URL(request.url);


    /*
     * ----------------------------------------------------------
     * NO INTERCEPTAR SUPABASE
     * ----------------------------------------------------------
     */

    if (
        request.method !== 'GET' ||
        url.hostname.includes('supabase.co')
    ) {
        return;
    }


    /*
     * ----------------------------------------------------------
     * DETERMINAR SI ES HTML
     * ----------------------------------------------------------
     */

    const esHTML =
        request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/');


    /*
     * ==========================================================
     * HTML
     *
     * NETWORK FIRST
     * ==========================================================
     */

    if (esHTML) {

        event.respondWith(

            fetch(request)

                .then(networkResponse => {

                    /*
                     * Guardamos la versión nueva
                     * si la respuesta es válida.
                     */

                    if (
                        networkResponse &&
                        networkResponse.ok
                    ) {

                        const copia =
                            networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                return cache.put(
                                    request,
                                    copia
                                );

                            })
                            .catch(error => {

                                console.error(
                                    '[SW] Error guardando HTML:',
                                    error
                                );

                            });

                    }

                    return networkResponse;

                })

                .catch(() => {

                    /*
                     * Sin internet:
                     * usar caché.
                     */

                    return caches.match(request)
                        .then(cachedResponse => {

                            if (cachedResponse) {
                                return cachedResponse;
                            }


                            /*
                             * Si no existe tampoco en caché.
                             */

                            return new Response(
                                `
                                <!DOCTYPE html>
                                <html lang="es">
                                <head>
                                    <meta charset="UTF-8">
                                    <title>Sin conexión</title>
                                </head>
                                <body>
                                    <h2>Sin conexión</h2>
                                    <p>
                                        No hay conexión a Internet
                                        y esta página todavía
                                        no está disponible sin conexión.
                                    </p>
                                </body>
                                </html>
                                `,
                                {
                                    status: 503,
                                    headers: {
                                        'Content-Type':
                                            'text/html; charset=utf-8'
                                    }
                                }
                            );

                        });

                })

        );

        return;
    }


    /*
     * ==========================================================
     * RECURSOS ESTÁTICOS
     *
     * CACHE FIRST
     * ==========================================================
     */

    event.respondWith(

        caches.match(request)

            .then(cachedResponse => {

                /*
                 * Si existe caché:
                 * devolver inmediatamente.
                 */

                if (cachedResponse) {

                    /*
                     * Actualizar en segundo plano.
                     */

                    event.waitUntil(

                        fetch(request)

                            .then(networkResponse => {

                                if (
                                    networkResponse &&
                                    networkResponse.ok
                                ) {

                                    return caches.open(
                                        CACHE_NAME
                                    ).then(cache => {

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
                                 * dejamos la caché intacta.
                                 */

                            })

                    );

                    return cachedResponse;
                }


                /*
                 * No está en caché:
                 * buscar en red.
                 */

                return fetch(request);

            })

    );

});
