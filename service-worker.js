const CACHE_NAME = 'rawad-store-cache-v2';
const urlsToCache = [
    '/',
    '/index.html',  // اسم الملف الرئيسي إذا كان مختلفًا
    '/styles.css',  // إذا فصلت CSS إلى ملف خارجي
    '/scripts.js',  // إذا فصلت JS إلى ملف خارجي
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
    'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/preview.jpg',
    // أضف أي صور أو موارد أخرى هنا (مثل أيقونات المنتجات إذا كانت موجودة)
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;  // Return from cache
                }
                return fetch(event.request).then(
                    (networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    }
                );
            })
            .catch(() => {
                // Offline fallback page (create a simple offline.html if needed)
                return caches.match('/offline.html') || new Response('غير متصل بالإنترنت', { status: 503 });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
