import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata = {
  title: 'Offline · FanBrain AI',
  description: 'FanBrain AI offline fallback page.',
};

export default function OfflinePage() {
  return (
    <section className="card-gradient mx-auto max-w-2xl rounded-3xl border border-white/10 p-6 text-center shadow-glow sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-300/10 text-amber-100">
        <WifiOff size={30} aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">You&apos;re offline</h1>
      <p className="mx-auto mt-3 max-w-lg text-gray-300">
        Reconnect to create predictions, load profiles, refresh leaderboards, or generate AI verdicts.
      </p>
      <Link href="/" className="btn btn-primary mt-6 px-6 py-3">
        Try again
      </Link>
    </section>
  );
}
