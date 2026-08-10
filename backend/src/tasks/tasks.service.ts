import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, ownerId: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(user: AuthUser, projectId?: string) {
    const where: Prisma.TaskWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (user.role !== Role.ADMIN) {
      where.project = {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      };
    }

    return this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateTaskDto, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (user.role !== Role.ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('You can only add tasks to projects you own');
    }

    if (dto.assigneeId) {
      await this.assertAssigneeBelongsToProject(dto.projectId, dto.assigneeId);
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId ?? null,
        status: dto.status,
        priority: dto.priority,
      },
      include: taskInclude,
    });
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isAdmin = user.role === Role.ADMIN;
    const isOwner = task.project.ownerId === user.id;
    const isAssignee = task.assigneeId === user.id;

    if (!isAdmin && !isOwner && !isAssignee) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    let data: Prisma.TaskUpdateInput;

    if (isAdmin || isOwner) {
      data = {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
      };

      if (dto.assigneeId !== undefined) {
        if (dto.assigneeId) {
          await this.assertAssigneeBelongsToProject(task.projectId, dto.assigneeId);
          data.assignee = { connect: { id: dto.assigneeId } };
        } else {
          data.assignee = { disconnect: true };
        }
      }
    } else {
      if (dto.status === undefined) {
        throw new ForbiddenException('You can only update the status of tasks assigned to you');
      }
      data = { status: dto.status };
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
  }

  async remove(id: string, user: AuthUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user.role !== Role.ADMIN && task.project.ownerId !== user.id) {
      throw new ForbiddenException('Only the project owner or an admin can delete this task');
    }

    await this.prisma.task.delete({ where: { id } });
    return { message: 'Task deleted' };
  }

  private async assertAssigneeBelongsToProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });

    if (project?.ownerId === userId) {
      return;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('The assignee must be a member of the project');
    }
  }
}
