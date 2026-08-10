import type { Role, TaskPriority, TaskStatus } from './types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  DONE: 'bg-emerald-100 text-emerald-700',
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-indigo-100 text-indigo-700',
  HIGH: 'bg-rose-100 text-rose-700',
};

export const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-brand-100 text-brand-700',
  MEMBER: 'bg-slate-100 text-slate-700',
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
export const PRIORITY_ORDER: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
