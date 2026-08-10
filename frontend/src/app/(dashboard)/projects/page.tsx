'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  async function load() {
    const data = await api.get<Project[]>('/projects');
    setProjects(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/projects', { name, description: description || undefined });
      setName('');
      setDescription('');
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Projects you own or belong to."
        action={
          canCreate ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              New project
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">
          No projects yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card p-5 transition hover:shadow-md"
            >
              <h3 className="font-semibold">{project.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                {project.description ?? 'No description'}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{project._count.tasks} tasks</span>
                <span>{project.members.length + 1} people</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Owner: {project.owner.name}</p>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} title="Create project" onClose={() => setOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
