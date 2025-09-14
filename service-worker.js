const CACHE_NAME = 'rawad-store-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',  // إذا كان الـ CSS منفصلاً
  '/scripts.js',  // إذا كان الـ JS منفصلاً
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
  'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/preview.jpg',
  'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/icon-192x192.png',
  'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/icon-512x512.png'
  // أضف أي أصول أخرى مثل صور المنتجات
];

// Install Event: Cache Assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate Event: Clean Old Caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Serve from Cache or Network
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      }).catch(() => {
        // إرجاع صفحة غير متصل إذا لزم الأمر
        return caches.match('/offline.html');  // أنشئ صفحة offline.html إذا أردت
      })
  );
});

// Push Notification Event
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/icon-192x192.png',
    badge: 'https://raw.githubusercontent.com/rawad-store/rawad-store.github.io/main/icon-192x192.png'
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
