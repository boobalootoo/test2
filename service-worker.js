// Define the cache name and the assets to cache
const CACHE_NAME = 'no-refresh-site-v1';
const urlsToCache = [
    '/', // Caches the root path, which is usually index.html
    '/index.html', // Explicitly cache index.html
    '/service-worker.js', // Cache the service worker itself
    // Add other assets like CSS, JS, images if you have them
    // For this example, Tailwind CSS is loaded via CDN, so it won't be cached directly by this worker.
    // If you were self-hosting Tailwind, you'd include its CSS file here.
];

// Install event: caches the static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install event triggered');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Caching failed', error);
            })
    );
});

// Activate event: cleans up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate event triggered');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: serves cached content when offline
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests and not other methods like POST
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If the request is in the cache, return the cached response
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }

                // If not in cache, fetch from the network
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response because it's a stream and can only be consumed once
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch((error) => {
                        // This catch block handles network errors (e.g., user is offline)
                        console.error('Service Worker: Fetch failed, network error:', error);
                        // You could return a custom offline page here if desired
                        // For example: return caches.match('/offline.html');
                        // For this basic example, it will just fail silently if the resource isn't cached
                    });
            })
    );
});
