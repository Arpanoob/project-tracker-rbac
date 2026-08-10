'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TaskItem } from '@/components/task-item';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Task, TaskStatus } from '@/lib/types';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/ui';

type Filter = 'ALL' | 'MINE' | TaskStatus;

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    api
      .get<Task[]>('/tasks')
      .then(setTasks)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return tasks;
    if (filter === 'MINE') return tasks.filter((task) => task.assigneeId === user?.id);
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter, user]);

  async function handleStatusChange(task: Task, status: TaskStatus) {
    const updated = await api.patch<Task>(`/tasks/${task.id}`, { status });
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await api.delete(`/tasks/${task.id}`);
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'MINE', label: 'Assigned to me' },
    ...STATUS_ORDER.map((status) => ({ key: status as Filter, label: STATUS_LABELS[status] })),
  ];

  function canManage(task: Task) {
    return user?.role === 'ADMIN' || task.project.ownerId === user?.id;
  }

  return (
    <div>
      <PageHeader title="Tasks" description="Every task across projects you can access." />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === item.key
                ? 'bg-brand-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">No tasks to show.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              showProject
              canManage={canManage(task)}
              canUpdateStatus={canManage(task) || task.assigneeId === user?.id}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
