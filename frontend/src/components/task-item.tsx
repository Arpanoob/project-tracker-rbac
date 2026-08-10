'use client';

import type { Task, TaskStatus } from '@/lib/types';
import { PRIORITY_STYLES, STATUS_LABELS, STATUS_ORDER, STATUS_STYLES } from '@/lib/ui';

interface TaskItemProps {
  task: Task;
  showProject?: boolean;
  canManage: boolean;
  canUpdateStatus: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function TaskItem({
  task,
  showProject,
  canManage,
  canUpdateStatus,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskItemProps) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{task.title}</p>
          <span className={`badge ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
        </div>
        {task.description && (
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{task.description}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {showProject && <span>{task.project.name} · </span>}
          {task.assignee ? `Assigned to ${task.assignee.name}` : 'Unassigned'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canUpdateStatus ? (
          <select
            className="input !w-auto !py-1.5 text-sm"
            value={task.status}
            onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
          >
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        ) : (
          <span className={`badge ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
        )}

        {canManage && onEdit && (
          <button className="btn-ghost !px-2 !py-1.5 text-sm" onClick={() => onEdit(task)}>
            Edit
          </button>
        )}
        {canManage && onDelete && (
          <button className="btn-danger !px-2 !py-1.5 text-sm" onClick={() => onDelete(task)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
