/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isBlockedSameOriginPath = (pathname: string) =>
  pathname.startsWith('/api/') ||
  pathname.startsWith('/auth') ||
  pathname.startsWith('/profile') ||
  pathname.startsWith('/p/') ||
  pathname.startsWith('/_next/data/');

const isSupabaseRequest = (url: URL) => url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in');

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && isBlockedSameOriginPath(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => isSupabaseRequest(url),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'fanbrain-next-static',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin &&
      (url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/images/') ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/manifest.webmanifest'),
    handler: new StaleWhileRevalidate({
      cacheName: 'fanbrain-static-assets',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  {
    matcher: /.*/i,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // skipWaiting is intentionally false: a new worker waits so the app can show an
  // "update available" prompt (see UpdateToast) and skip-waiting on the user's
  // click, rather than swapping assets out from under an active session.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Push notifications (personal result alerts) ---
// Payload shape matches src/lib/notifications/send-result-notifications.ts.
type PushPayload = { title: string; body: string; url: string };

self.addEventListener('push', (event) => {
  let payload: PushPayload;
  try {
    payload = event.data?.json() as PushPayload;
  } catch {
    payload = { title: 'FanBrain', body: 'Your result is in.', url: '/predictions' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? '/predictions';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Focus an existing FanBrain tab and route it there rather than opening a duplicate.
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Cross-origin navigate can throw; the focus alone is still useful.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
