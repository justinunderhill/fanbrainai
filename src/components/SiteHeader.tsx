import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';
import { AuthNavLink } from '@/components/AuthNavLink';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-center gap-2 font-black tracking-tight">
          <span className="rounded-2xl bg-emerald-400 p-2 text-gray-950 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110 group-active:scale-95"><BrainCircuit size={20} /></span>
          <span>FanBrain AI</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-300">
          <Link href="/matches" className="nav-link">Matches</Link>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
          <Link href="/profile" className="nav-link">Profile</Link>
          <AuthNavLink />
        </nav>
      </div>
    </header>
  );
}
