// public/sw.js
// 保守的で安全な Service Worker。
// - 認証ページ/HTML はキャッシュしない（古い・認証済みページの誤配信を防ぐ）。
// - 静的アセットのみ versioned cache に cache-first（stale-while-revalidate）。
// - ナビゲーションは network-first、失敗時のみ最小のオフライン HTML を返す。
// - 同一オリジンの GET 以外（Supabase 等のクロスオリジン含む）は素通り。
/* eslint-disable */
"use strict";

const CACHE = "dentia-static-v1";

const OFFLINE_HTML = `<!doctype html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#6ab3e0"><title>オフライン — Dentia</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;
    background:#fff;color:#334155;text-align:center;padding:24px}
  .dot{width:14px;height:14px;border-radius:50%;background:#6ab3e0;
    display:inline-block;margin-bottom:14px}
  h1{font-size:18px;font-weight:700;margin:0 0 8px}
  p{font-size:14px;color:#64748b;margin:0}
</style></head><body><div><div class="dot"></div>
<h1>オフラインです</h1><p>接続を確認してください</p></div></body></html>`;

const STATIC_EXT =
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|map|json|txt)$/i;

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    STATIC_EXT.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.addAll([
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/icons/maskable-512.png",
          "/icons/apple-touch-icon.png",
        ]);
      } catch (_) {
        // 失敗してもインストールは継続（防御的）。
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        );
      } catch (_) {}
      try {
        await self.clients.claim();
      } catch (_) {}
    })()
  );
});

self.addEventListener("fetch", (event) => {
  let url;
  const req = event.request;

  // 同一オリジンの GET のみ対象。それ以外は素通り。
  if (req.method !== "GET") return;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // 静的アセット: cache-first（+ バックグラウンド更新）。
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(req);
          const network = fetch(req)
            .then((res) => {
              if (res && res.ok && res.type === "basic") {
                cache.put(req, res.clone()).catch(() => {});
              }
              return res;
            })
            .catch(() => null);
          return cached || (await network) || fetch(req);
        } catch (_) {
          return fetch(req);
        }
      })()
    );
    return;
  }

  // ナビゲーション: network-first（HTML はキャッシュしない）。
  if (req.mode === "navigation") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch (_) {
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })()
    );
    return;
  }

  // それ以外は何もしない（素通り）。
  return;
});
