'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-semibold">Forgot password</h1>
        {sent ? (
          <p className="text-center text-sm text-gray-600">
            If that email exists, we sent a reset link. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting && <Spinner className="h-4 w-4" />}
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
            <a className="block text-center text-sm text-brand-600 underline" href="/login">
              Back to sign in
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
