import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { SiteHeader } from '@/components/SiteHeader';

// Absolute base for OG/Twitter image URLs so shared links unfurl correctly.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanbrainai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
