/* [오름] 데스크 PWA 서비스워커
   - 앱 셸(index.html·아이콘)만 캐시해 오프라인/설치 가능하게 함
   - 구글 Apps Script 등 외부 API(수납·시트 데이터)는 캐시하지 않고 항상 네트워크 */
const CACHE = "oreum-desk-v1";
const SHELL = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 다른 출처(구글 스크립트·CDN 등)는 서비스워커가 관여하지 않음 → 항상 최신 데이터
  if (url.origin !== self.location.origin) return;

  // 문서(페이지 이동)는 네트워크 우선, 오프라인이면 캐시된 셸로 폴백
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 그 외 동일 출처 정적 파일은 캐시 우선, 없으면 네트워크 후 캐시
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }))
  );
});
