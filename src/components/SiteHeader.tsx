'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrainCircuit, Menu, X } from 'lucide-react';
import { AuthNavLink } from '@/components/AuthNavLink';

const NAV_LINKS = [
  { href: '/matches', label: 'Matches' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes (e.g. browser back/forward),
  // adjusting state during render per React's recommended pattern.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="group flex items-center gap-2 font-black tracking-tight"
        >
          <span className="rounded-2xl bg-emerald-400 p-2 text-gray-950 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110 group-active:scale-95">
            <BrainCircuit size={20} />
          </span>
          <span>FanBrain AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm text-gray-300 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
          <AuthNavLink />
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="btn btn-ghost p-2 md:hidden"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 bg-gray-950/95 px-4 py-3 md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-3 py-3 text-base font-semibold transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <AuthNavLink className="mt-2 w-full" onNavigate={() => setMenuOpen(false)} />
          </div>
        </nav>
      )}
    </header>
  );
}
