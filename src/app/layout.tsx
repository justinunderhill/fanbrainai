import type { Metadata, Viewport } from 'next';
import { SerwistProvider } from '@serwist/turbopack/react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SiteHeader } from '@/components/SiteHeader';
import { UpdateToast } from '@/components/UpdateToast';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  // Absolute base that all relative metadata URLs (og:image, twitter:image, og:url,
  // canonical) resolve against, so shared links unfurl correctly.
  metadataBase: new URL(SITE_URL),
  title: 'FanBrain AI',
  description: 'AI-powered football prediction and fan personality companion.',
  applicationName: 'FanBrainAI',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'FanBrain',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  // Draw under the iOS status bar / home indicator so safe-area insets apply
  // (paired with the .pt-safe / .bottom-safe handling and black-translucent bar).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV !== 'production'}
          cacheOnNavigation={false}
          reloadOnOnline={false}
        >
          <AuthProvider>
            <SiteHeader />
            <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">{children}</main>
            <InstallPrompt />
            <UpdateToast />
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
