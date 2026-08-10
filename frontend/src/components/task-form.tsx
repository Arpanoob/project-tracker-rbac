'use client';

import { useState } from 'react';
import { Modal } from '@/components/modal';
import { ApiError } from '@/lib/api';
import type { Task, TaskPriority, TaskStatus, User } from '@/lib/types';
import { PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '@/lib/ui';

export interface TaskFormValues {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
}

interface TaskFormProps {
  open: boolean;
  title: string;
  assignableUsers: User[];
  initial?: Task;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
}

export function TaskForm({ open, title, assignableUsers, initial, onClose, onSubmit }: TaskFormProps) {
  const [taskTitle, setTaskTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>(initial?.assigneeId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        title: taskTitle,
        description: description || undefined,
        status,
        priority,
        assigneeId: assigneeId || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              {PRIORITY_ORDER.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select
            className="input"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
