// LaunderSync service worker: offline-first shell for the customer PWA.
const CACHE = 'ff-cache-v1'

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', function (event) {
  var req = event.request
  if (req.method !== 'GET' || req.url.indexOf(self.location.origin) !== 0) return
  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetched = fetch(req)
        .then(function (res) {
          var copy = res.clone()
          caches.open(CACHE).then(function (c) { c.put(req, copy) }).catch(function () {})
          return res
        })
        .catch(function () { return cached })
      return cached || fetched
    })
  )
})
