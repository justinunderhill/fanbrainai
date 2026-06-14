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
