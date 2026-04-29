// 기본적인 Service Worker
// 오프라인에서도 앱이 실행되도록 캐싱
const CACHE_NAME = 'consult-schedule-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Supabase API 호출은 캐싱하지 않음
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // 오프라인일 때 메인 페이지 반환
        return caches.match('/');
      });
    })
  );
});
