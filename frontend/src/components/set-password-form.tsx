'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function SetPasswordForm({ mode }: { mode: 'set' | 'reset' }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    if (!t) {
      setTokenValid(false);
      return;
    }
    api
      .get<{ valid: boolean }>(`/auth/token/${t}`)
      .then((r) => setTokenValid(r.valid))
      .catch(() => setTokenValid(false));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/set-password', { token, password });
      router.replace('/login?reset=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to set password');
    } finally {
      setSubmitting(false);
    }
  }

  const heading = mode === 'set' ? 'Set your password' : 'Reset your password';

  if (tokenValid === false) {
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-2xl font-semibold">Link expired</h1>
        <p className="mb-4 text-sm text-gray-500">
          This link is invalid or has expired.
        </p>
        <a className="text-brand-600 underline" href="/forgot-password">
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="mb-6 text-center text-2xl font-semibold">{heading}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password"
          className="w-full rounded-lg border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="w-full rounded-lg border px-3 py-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || tokenValid === null}
          className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
