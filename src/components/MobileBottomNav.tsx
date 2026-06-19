'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit, ListChecks, Medal, Trophy, Users } from 'lucide-react';

const ITEMS = [
  { href: '/matches', label: 'Matches', icon: Trophy },
  { href: '/predictions', label: 'My Picks', icon: ListChecks },
  { href: '/leaderboard', label: 'Board', icon: Medal },
  { href: '/leagues', label: 'Leagues', icon: Users },
  { href: '/profile', label: 'Profile', icon: BrainCircuit },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-gray-950/95 px-3 pb-mobile-nav-safe pt-2 backdrop-blur md:hidden" aria-label="Primary">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/70 ${
                active ? 'bg-emerald-400 text-gray-950 shadow-glow' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={19} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
