'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Role, User } from '@/lib/types';
import { initials, ROLE_STYLES } from '@/lib/ui';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEMBER'];

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const emptyForm: FormState = { name: '', email: '', password: '', role: 'MEMBER' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: User }>({ open: false });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get<User[]>('/users');
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModal({ open: true });
  }

  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setError(null);
    setModal({ open: true, editing: user });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (modal.editing) {
        const body: Partial<FormState> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        await api.patch(`/users/${modal.editing.id}`, body);
      } else {
        await api.post('/users', {
          name: form.name,
          email: form.email,
          role: form.role,
        });
      }
      setModal({ open: false });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Unable to delete user');
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts and roles across the workspace."
        action={
          <button className="btn-primary" onClick={openCreate}>
            New user
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {initials(user.name)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_STYLES[user.role]}`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-ghost !px-2 !py-1 text-sm"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger !px-2 !py-1 text-sm disabled:opacity-40"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal.open}
        title={modal.editing ? 'Edit user' : 'New user'}
        onClose={() => setModal({ open: false })}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </div>
          {modal.editing ? (
            <div>
              <label className="label">
                Password <span className="text-slate-400">(leave blank to keep)</span>
              </label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                minLength={form.password ? 8 : undefined}
              />
            </div>
          ) : (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
              An invite email will be sent so they can set their own password.
            </p>
          )}
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal({ open: false })}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
