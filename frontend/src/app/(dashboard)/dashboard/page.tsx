'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Project, Task } from '@/lib/types';
import { STATUS_LABELS, STATUS_ORDER, STATUS_STYLES } from '@/lib/ui';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Project[]>('/projects'), api.get<Task[]>('/tasks')])
      .then(([projectData, taskData]) => {
        setProjects(projectData);
        setTasks(taskData);
      })
      .finally(() => setLoading(false));
  }, []);

  const myTasks = tasks.filter((task) => task.assigneeId === user?.id);
  const openTasks = tasks.filter((task) => task.status !== 'DONE');

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));

  const stats = [
    { label: 'Projects', value: projects.length },
    { label: 'Open tasks', value: openTasks.length },
    { label: 'Assigned to me', value: myTasks.length },
    { label: 'Completed', value: tasks.filter((t) => t.status === 'DONE').length },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name.split(' ')[0]}`}
        description="Here is what is happening across your workspace."
      />

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-5">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Tasks by status
              </h2>
              <div className="space-y-3">
                {statusCounts.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`badge ${STATUS_STYLES[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  My tasks
                </h2>
                <Link href="/tasks" className="text-sm text-brand-600 hover:underline">
                  View all
                </Link>
              </div>
              {myTasks.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing assigned to you yet.</p>
              ) : (
                <ul className="space-y-3">
                  {myTasks.slice(0, 5).map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="truncate text-xs text-slate-400">{task.project.name}</p>
                      </div>
                      <span className={`badge shrink-0 ${STATUS_STYLES[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
