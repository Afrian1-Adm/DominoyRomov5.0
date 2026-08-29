const CORE_CACHE = 'club-domino-core';
const RUNTIME_CACHE = 'club-domino-runtime';

const CORE_ASSETS = [
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
        (async () => {

            const cache = await caches.open(CORE_CACHE);

            await Promise.allSettled(
                CORE_ASSETS.map(async asset => {

                    try {

                        const request = new Request(
                            asset,
                            {
                                cache: 'no-store'
                            }
                        );

                        const response = await fetch(request);

                        if (
                            response &&
                            response.ok
                        ) {
                            await cache.put(
                                asset,
                                response.clone()
                            );
                        }

                    } catch (error) {

                        console.warn(
                            '[SW] No se pudo precargar:',
                            asset,
                            error
                        );

                    }

                })
            );

            await self.skipWaiting();

        })()
    );

});


/*
 * ============================================================
 * ACTIVACIÓN
 * ============================================================
 */
self.addEventListener('activate', event => {

    event.waitUntil(
        (async () => {

            const allowedCaches = new Set([
                CORE_CACHE,
                RUNTIME_CACHE
            ]);

            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames.map(cacheName => {

                    if (
                        cacheName.startsWith('club-domino-') &&
                        !allowedCaches.has(cacheName)
                    ) {

                        console.log(
                            '[SW] Eliminando caché antigua:',
                            cacheName
                        );

                        return caches.delete(cacheName);
                    }

                    return Promise.resolve();

                })
            );

            await self.clients.claim();

        })()
    );

});


/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function normalizarClaveHTML(request) {

    const url = new URL(request.url);

    return new Request(
        url.origin + url.pathname,
        {
            method: 'GET'
        }
    );

}


function esRecursoActualizable(request, url) {

    const pathname = url.pathname.toLowerCase();

    return (
        request.mode === 'navigate' ||
        request.destination === 'document' ||
        request.destination === 'script' ||
        request.destination === 'style' ||
        pathname.endsWith('.html') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.json') ||
        pathname.endsWith('.webmanifest')
    );

}


function esRecursoVisual(request, url) {

    const pathname = url.pathname.toLowerCase();

    return (
        request.destination === 'image' ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.webp') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.ico')
    );

}


/*
 * ============================================================
 * NETWORK FIRST
 * ============================================================
 */
async function networkFirst(request) {

    const url = new URL(request.url);

    const esHTML =
        request.mode === 'navigate' ||
        request.destination === 'document' ||
        url.pathname.toLowerCase().endsWith('.html') ||
        url.pathname.endsWith('/');

    const cacheKey = esHTML
        ? normalizarClaveHTML(request)
        : request;

    try {

        const networkRequest = new Request(
            request,
            {
                cache: 'no-store'
            }
        );

        const networkResponse =
            await fetch(networkRequest);

        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const cache =
                await caches.open(RUNTIME_CACHE);

            await cache.put(
                cacheKey,
                networkResponse.clone()
            );
        }

        return networkResponse;

    } catch (error) {

        const runtimeCache =
            await caches.open(RUNTIME_CACHE);

        const runtimeResponse =
            await runtimeCache.match(cacheKey);

        if (runtimeResponse) {
            return runtimeResponse;
        }

        const coreCache =
            await caches.open(CORE_CACHE);

        const coreResponse =
            await coreCache.match(cacheKey);

        if (coreResponse) {
            return coreResponse;
        }

        if (esHTML) {

            const indexResponse =
                await coreCache.match('./index.html');

            if (indexResponse) {
                return indexResponse;
            }

            return new Response(
                `
                <!DOCTYPE html>
                <html lang="es">

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >

                    <title>
                        Sin conexión
                    </title>

                    <style>

                        body{
                            font-family:
                                system-ui,
                                sans-serif;

                            max-width:600px;

                            margin:60px auto;

                            padding:20px;

                            color:#0f172a;
                        }

                    </style>

                </head>

                <body>

                    <h2>
                        Sin conexión
                    </h2>

                    <p>
                        No hay conexión a Internet
                        y esta página todavía no está
                        disponible sin conexión.
                    </p>

                </body>

                </html>
                `,
                {
                    status:503,

                    headers:{
                        'Content-Type':
                            'text/html; charset=utf-8'
                    }
                }
            );
        }

        throw error;

    }

}


/*
 * ============================================================
 * STALE WHILE REVALIDATE
 *
 * Para imágenes:
 * muestra caché rápidamente,
 * pero actualiza en segundo plano.
 * ============================================================
 */
async function staleWhileRevalidate(request) {

    const cache =
        await caches.open(RUNTIME_CACHE);

    const cachedResponse =
        await cache.match(request);

    const networkPromise =
        fetch(
            new Request(
                request,
                {
                    cache:'no-store'
                }
            )
        )

        .then(async networkResponse => {

            if (
                networkResponse &&
                networkResponse.ok
            ) {

                await cache.put(
                    request,
                    networkResponse.clone()
                );

            }

            return networkResponse;

        })

        .catch(() => null);


    if (cachedResponse) {

        networkPromise.catch(() => {});

        return cachedResponse;

    }


    const networkResponse =
        await networkPromise;


    if (networkResponse) {
        return networkResponse;
    }


    return new Response(
        '',
        {
            status:504,
            statusText:'Sin conexión'
        }
    );

}


/*
 * ============================================================
 * PETICIONES
 * ============================================================
 */
self.addEventListener('fetch', event => {

    const request = event.request;

    const url =
        new URL(request.url);


    /*
     * Nunca interceptar POST,
     * PUT, PATCH o DELETE.
     */
    if (request.method !== 'GET') {
        return;
    }


    /*
     * Nunca interceptar Supabase.
     */
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('supabase.in')
    ) {
        return;
    }


    /*
     * No cachear recursos externos.
     *
     * Ej:
     * jsDelivr
     * Google
     * etc.
     */
    if (
        url.origin !==
        self.location.origin
    ) {
        return;
    }


    /*
     * HTML / JS / CSS / JSON
     *
     * RED PRIMERO.
     */
    if (
        esRecursoActualizable(
            request,
            url
        )
    ) {

        event.respondWith(
            networkFirst(request)
        );

        return;
    }


    /*
     * IMÁGENES
     *
     * CACHÉ + actualización.
     */
    if (
        esRecursoVisual(
            request,
            url
        )
    ) {

        event.respondWith(
            staleWhileRevalidate(request)
        );

        return;
    }


    /*
     * Cualquier otro GET local.
     */
    event.respondWith(
        networkFirst(request)
    );

});


/*
 * ============================================================
 * MENSAJES
 * ============================================================
 */
self.addEventListener('message', event => {

    if (
        event.data &&
        event.data.type === 'SKIP_WAITING'
    ) {

        self.skipWaiting();

    }

});