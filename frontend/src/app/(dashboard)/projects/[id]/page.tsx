'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/modal';
import { PageHeader } from '@/components/page-header';
import { TaskForm, TaskFormValues } from '@/components/task-form';
import { TaskItem } from '@/components/task-item';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Project, Task, TaskStatus, User } from '@/lib/types';
import { initials, ROLE_STYLES } from '@/lib/ui';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [directory, setDirectory] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [memberModal, setMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');

  const canManage = useMemo(() => {
    if (!project || !user) return false;
    return user.role === 'ADMIN' || project.ownerId === user.id;
  }, [project, user]);

  const load = useCallback(async () => {
    try {
      const [projectData, taskData] = await Promise.all([
        api.get<Project>(`/projects/${id}`),
        api.get<Task[]>(`/tasks?projectId=${id}`),
      ]);
      setProject(projectData);
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canManage) {
      api.get<User[]>('/users/directory').then(setDirectory).catch(() => setDirectory([]));
    }
  }, [canManage]);

  const projectPeople = useMemo(() => {
    if (!project) return [];
    return [project.owner, ...project.members.map((member) => member.user)];
  }, [project]);

  const memberIds = new Set(projectPeople.map((person) => person.id));
  const addableUsers = directory.filter((candidate) => !memberIds.has(candidate.id));

  async function handleStatusChange(task: Task, status: TaskStatus) {
    const updated = await api.patch<Task>(`/tasks/${task.id}`, { status });
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  }

  async function handleTaskSubmit(values: TaskFormValues) {
    if (taskModal.task) {
      await api.patch(`/tasks/${taskModal.task.id}`, values);
    } else {
      await api.post('/tasks', { ...values, projectId: id });
    }
    await load();
  }

  async function handleTaskDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await api.delete(`/tasks/${task.id}`);
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
  }

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMember) return;
    await api.post(`/projects/${id}/members`, { userId: selectedMember });
    setSelectedMember('');
    setMemberModal(false);
    await load();
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remove this member from the project?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    await load();
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this project and all of its tasks?')) return;
    await api.delete(`/projects/${id}`);
    router.push('/projects');
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (error || !project) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-500">{error ?? 'Project not found'}</p>
        <Link href="/projects" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/projects" className="text-sm text-brand-600 hover:underline">
        ← Projects
      </Link>

      <PageHeader
        title={project.name}
        description={project.description ?? 'No description'}
        action={
          canManage ? (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => setTaskModal({ open: true })}>
                Add task
              </button>
              <button className="btn-danger" onClick={handleDeleteProject}>
                Delete project
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Tasks ({tasks.length})
            </h2>
          </div>
          {tasks.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-400">No tasks yet.</div>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                canManage={canManage}
                canUpdateStatus={canManage || task.assigneeId === user?.id}
                onStatusChange={handleStatusChange}
                onEdit={(current) => setTaskModal({ open: true, task: current })}
                onDelete={handleTaskDelete}
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Team ({projectPeople.length})
            </h2>
            {canManage && (
              <button
                className="text-sm text-brand-600 hover:underline"
                onClick={() => setMemberModal(true)}
              >
                Add member
              </button>
            )}
          </div>
          <div className="card divide-y divide-slate-100">
            {projectPeople.map((person) => (
              <div key={person.id} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {initials(person.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="truncate text-xs text-slate-400">{person.email}</p>
                </div>
                {person.id === project.ownerId ? (
                  <span className="badge bg-amber-100 text-amber-700">Owner</span>
                ) : (
                  <span className={`badge ${ROLE_STYLES[person.role]}`}>{person.role}</span>
                )}
                {canManage && person.id !== project.ownerId && (
                  <button
                    className="text-xs text-rose-600 hover:underline"
                    onClick={() => handleRemoveMember(person.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {taskModal.open && (
        <TaskForm
          open={taskModal.open}
          title={taskModal.task ? 'Edit task' : 'Add task'}
          assignableUsers={projectPeople}
          initial={taskModal.task}
          onClose={() => setTaskModal({ open: false })}
          onSubmit={handleTaskSubmit}
        />
      )}

      <Modal open={memberModal} title="Add member" onClose={() => setMemberModal(false)}>
        <form onSubmit={handleAddMember} className="space-y-4">
          {addableUsers.length === 0 ? (
            <p className="text-sm text-slate-500">Everyone is already on this project.</p>
          ) : (
            <div>
              <label className="label">Select a user</label>
              <select
                className="input"
                value={selectedMember}
                onChange={(event) => setSelectedMember(event.target.value)}
                required
              >
                <option value="">Choose…</option>
                {addableUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({candidate.role})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setMemberModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={addableUsers.length === 0}>
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
