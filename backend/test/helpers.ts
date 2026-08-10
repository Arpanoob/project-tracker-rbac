import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

export const PASSWORD = 'Password123!';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedFixtures(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const [admin, manager, member, outsider] = await Promise.all([
    prisma.user.create({
      data: { name: 'Ava Admin', email: 'admin@test.dev', passwordHash, role: Role.ADMIN },
    }),
    prisma.user.create({
      data: { name: 'Max Manager', email: 'manager@test.dev', passwordHash, role: Role.MANAGER },
    }),
    prisma.user.create({
      data: { name: 'Mia Member', email: 'member@test.dev', passwordHash, role: Role.MEMBER },
    }),
    prisma.user.create({
      data: { name: 'Otto Outsider', email: 'outsider@test.dev', passwordHash, role: Role.MEMBER },
    }),
  ]);

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Rebuild the marketing site.',
      ownerId: manager.id,
      members: { create: [{ userId: member.id }] },
    },
  });

  const memberTask = await prisma.task.create({
    data: {
      title: 'Design the landing page',
      projectId: project.id,
      assigneeId: member.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
    },
  });

  const unassignedTask = await prisma.task.create({
    data: {
      title: 'Audit performance',
      projectId: project.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
    },
  });

  return { admin, manager, member, outsider, project, memberTask, unassignedTask };
}

export async function login(app: INestApplication, email: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  const cookies = response.headers['set-cookie'];
  const header = Array.isArray(cookies) ? cookies : [cookies];
  const accessCookie = header.find((cookie) => cookie.startsWith('access_token='));

  if (!accessCookie) {
    throw new Error('No access_token cookie returned from login');
  }

  return accessCookie.split(';')[0];
}
