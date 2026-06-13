import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  // Absolute base that all relative metadata URLs (og:image, twitter:image, og:url,
  // canonical) resolve against, so shared links unfurl correctly.
  metadataBase: new URL(SITE_URL),
  title: 'FanBrain AI',
  description: 'AI-powered football prediction and fan personality companion.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
