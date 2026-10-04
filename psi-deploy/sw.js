/* 싸이뛰어! 서비스 워커 — 한 번 열어 본 화면을 오프라인에서도 보여 줍니다.
   배포 후 화면이 안 바뀌면 아래 VERSION 숫자를 올리면 됩니다. */
const VERSION = 'psi-v18';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'assets/cover.webp', 'assets/game-icon.webp', 'assets/game-poster.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin) return;                         // 구글 시트(후기·게시판)·폰트는 항상 네트워크
  if (r.headers.has('range') || /\.(mp4|webm|mp3|m4a|ogg)$/i.test(u.pathname)) return;   // 영상·음악은 캐시하지 않음
  if (r.mode === 'navigate') {                                       // 페이지: 네트워크 우선, 실패하면 저장본
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('index.html') || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => {                          // 그 밖: 저장본을 먼저 보여 주고 뒤에서 갱신
    const net = fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); } return res; }).catch(() => m);
    return m || net;
  }));
});
