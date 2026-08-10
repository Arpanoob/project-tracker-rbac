export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pending?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  owner: User;
  members: ProjectMember[];
  _count: { tasks: number };
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  project: { id: string; name: string; ownerId: string };
  assigneeId?: string | null;
  assignee?: { id: string; name: string; email: string } | null;
  createdAt: string;
}
