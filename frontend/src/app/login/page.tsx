'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/spinner';
import { PasswordInput } from '@/components/password-input';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@tracker.dev' },
  { role: 'Manager', email: 'manager@tracker.dev' },
  { role: 'Member', email: 'member@tracker.dev' },
];

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const justReset = params.get('reset') === '1';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Password123!');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            PT
          </div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your project tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {justReset && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password saved. Please sign in.
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary flex w-full items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <a
            href="/forgot-password"
            className="block text-center text-sm text-brand-600 underline"
          >
            Forgot password?
          </a>
        </form>

        <div className="mt-6 card p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Demo accounts · password Password123!
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.email)}
                className="btn-ghost flex-col !items-start !py-2 text-left"
              >
                <span className="text-xs font-semibold">{account.role}</span>
                <span className="truncate text-[11px] text-slate-400">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
