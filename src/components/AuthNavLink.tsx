'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AuthNavLink() {
  const pathname = usePathname();
  const href = pathname && pathname !== '/auth'
    ? `/auth?next=${encodeURIComponent(pathname)}`
    : '/auth';

  return (
    <Link href={href} className="rounded-full bg-white px-4 py-2 font-semibold text-gray-950 hover:bg-emerald-200">
      Sign in
    </Link>
  );
}
