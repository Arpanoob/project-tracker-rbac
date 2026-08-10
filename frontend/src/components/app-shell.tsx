'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';
import { initials, ROLE_STYLES } from '@/lib/ui';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'MEMBER'] },
  { href: '/projects', label: 'Projects', roles: ['ADMIN', 'MANAGER', 'MEMBER'] },
  { href: '/tasks', label: 'Tasks', roles: ['ADMIN', 'MANAGER', 'MEMBER'] },
  { href: '/users', label: 'Users', roles: ['ADMIN'] },
  { href: '/audit', label: 'Audit log', roles: ['ADMIN'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            PT
          </div>
          <span className="font-semibold">Project Tracker</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <span className={`badge ${ROLE_STYLES[user.role]}`}>{user.role}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              PT
            </div>
            <span className="font-semibold">Project Tracker</span>
          </div>
          <div className="hidden text-sm text-slate-500 md:block">
            Signed in as <span className="font-medium text-slate-700">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="btn-ghost">
            Log out
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
