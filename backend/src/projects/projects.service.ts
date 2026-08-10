import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const projectInclude = {
  owner: { select: { id: true, name: true, email: true, role: true } },
  members: {
    select: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(user: AuthUser) {
    const where: Prisma.ProjectWhereInput =
      user.role === Role.ADMIN
        ? {}
        : {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          };

    return this.prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(id: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!this.canView(project, user)) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  create(dto: CreateProjectDto, user: AuthUser) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: user.id,
      },
      include: projectInclude,
    });
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthUser) {
    const project = await this.getManageableProject(id, user);

    return this.prisma.project.update({
      where: { id: project.id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: projectInclude,
    });
  }

  async remove(id: string, user: AuthUser) {
    const project = await this.getManageableProject(id, user);
    await this.prisma.project.delete({ where: { id: project.id } });
    return { message: 'Project deleted' };
  }

  async addMember(id: string, dto: AddMemberDto, user: AuthUser) {
    const project = await this.getManageableProject(id, user);

    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: dto.userId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId: dto.userId },
    });

    return this.findOneForUser(project.id, user);
  }

  async removeMember(id: string, memberUserId: string, user: AuthUser) {
    const project = await this.getManageableProject(id, user);

    await this.prisma.projectMember.deleteMany({
      where: { projectId: project.id, userId: memberUserId },
    });

    return this.findOneForUser(project.id, user);
  }

  private async getManageableProject(id: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (user.role !== Role.ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('Only the project owner or an admin can manage this project');
    }

    return project;
  }

  private canView(
    project: { ownerId: string; members: { user: { id: string } }[] },
    user: AuthUser,
  ) {
    if (user.role === Role.ADMIN) {
      return true;
    }

    if (project.ownerId === user.id) {
      return true;
    }

    return project.members.some((member) => member.user.id === user.id);
  }
}
