// Answers /__pass/<serial>.pkpass from the colinha-pass cache, so Safari gets a
// same-origin navigation with the pkpass MIME type. Everything else passes through.
const CACHE = 'colinha-pass';
const PASS_PATH = /^\/__pass\/[^/]+\.pkpass$/;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !PASS_PATH.test(url.pathname)) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(url.origin + url.pathname))
      .then((res) => res || new Response('Not found', { status: 404 })),
  );
});
