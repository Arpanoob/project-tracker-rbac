import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  login,
  resetDatabase,
  seedFixtures,
} from './helpers';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

  let adminCookie: string;
  let managerCookie: string;
  let memberCookie: string;
  let outsiderCookie: string;

  const server = () => request(app.getHttpServer());

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    fixtures = await seedFixtures(prisma);
    adminCookie = await login(app, fixtures.admin.email);
    managerCookie = await login(app, fixtures.manager.email);
    memberCookie = await login(app, fixtures.member.email);
    outsiderCookie = await login(app, fixtures.outsider.email);
  });

  describe('Authentication', () => {
    it('rejects requests without a session', () => {
      return server().get('/api/users').expect(401);
    });

    it('rejects an invalid password', () => {
      return server()
        .post('/api/auth/login')
        .send({ email: fixtures.admin.email, password: 'wrong-password' })
        .expect(401);
    });

    it('returns the current user from /auth/me', async () => {
      const response = await server()
        .get('/api/auth/me')
        .set('Cookie', memberCookie)
        .expect(200);

      expect(response.body.user.email).toBe(fixtures.member.email);
      expect(response.body.user.role).toBe('MEMBER');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('User management (Admin only)', () => {
    it('lets an admin list users', async () => {
      const response = await server()
        .get('/api/users')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.total).toBe(4);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[0]).not.toHaveProperty('passwordHash');
    });

    it('paginates and searches the user list', async () => {
      const firstPage = await server()
        .get('/api/users?page=1&pageSize=2')
        .set('Cookie', adminCookie)
        .expect(200);
      expect(firstPage.body.data).toHaveLength(2);
      expect(firstPage.body.total).toBe(4);

      const search = await server()
        .get('/api/users?search=manager')
        .set('Cookie', adminCookie)
        .expect(200);
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].email).toBe('manager@test.dev');
    });

    it('forbids a manager from listing users', () => {
      return server().get('/api/users').set('Cookie', managerCookie).expect(403);
    });

    it('forbids a member from listing users', () => {
      return server().get('/api/users').set('Cookie', memberCookie).expect(403);
    });

    it('lets an admin create a user', () => {
      return server()
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ name: 'New Person', email: 'new@test.dev', role: 'MEMBER' })
        .expect(201);
    });

    it('validates the create-user payload', () => {
      return server()
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({ name: 'x', email: 'not-an-email', role: 'MEMBER' })
        .expect(400);
    });

    it('rejects unknown properties in the payload', () => {
      return server()
        .post('/api/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'New Person',
          email: 'extra@test.dev',
          role: 'MEMBER',
          isSuperuser: true,
        })
        .expect(400);
    });

    it('stops an admin from deleting their own account', () => {
      return server()
        .delete(`/api/users/${fixtures.admin.id}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });
  });

  describe('Projects', () => {
    it('lets a manager create a project', () => {
      return server()
        .post('/api/projects')
        .set('Cookie', managerCookie)
        .send({ name: 'New Initiative', description: 'A fresh project' })
        .expect(201);
    });

    it('forbids a member from creating a project', () => {
      return server()
        .post('/api/projects')
        .set('Cookie', memberCookie)
        .send({ name: 'Sneaky Project' })
        .expect(403);
    });

    it('lets a project member view the project', () => {
      return server()
        .get(`/api/projects/${fixtures.project.id}`)
        .set('Cookie', memberCookie)
        .expect(200);
    });

    it('hides a project from a user who is not a member', () => {
      return server()
        .get(`/api/projects/${fixtures.project.id}`)
        .set('Cookie', outsiderCookie)
        .expect(403);
    });

    it('only returns projects the caller can access', async () => {
      const response = await server()
        .get('/api/projects')
        .set('Cookie', outsiderCookie)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('lets an admin see every project', async () => {
      const response = await server()
        .get('/api/projects')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('forbids a member from deleting a project', () => {
      return server()
        .delete(`/api/projects/${fixtures.project.id}`)
        .set('Cookie', memberCookie)
        .expect(403);
    });
  });

  describe('Tasks and ownership rules', () => {
    it('forbids a member from creating a task', () => {
      return server()
        .post('/api/tasks')
        .set('Cookie', memberCookie)
        .send({ title: 'A new task', projectId: fixtures.project.id })
        .expect(403);
    });

    it('lets the owning manager create a task in their project', () => {
      return server()
        .post('/api/tasks')
        .set('Cookie', managerCookie)
        .send({ title: 'Set up analytics', projectId: fixtures.project.id })
        .expect(201);
    });

    it('stops a manager from adding tasks to a project they do not own', async () => {
      const adminProject = await prisma.project.create({
        data: { name: 'Admin owned', ownerId: fixtures.admin.id },
      });

      return server()
        .post('/api/tasks')
        .set('Cookie', managerCookie)
        .send({ title: 'Intruding task', projectId: adminProject.id })
        .expect(403);
    });

    it('lets a member update the status of a task assigned to them', () => {
      return server()
        .patch(`/api/tasks/${fixtures.memberTask.id}`)
        .set('Cookie', memberCookie)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
    });

    it('stops a member from editing fields other than status on their task', () => {
      return server()
        .patch(`/api/tasks/${fixtures.memberTask.id}`)
        .set('Cookie', memberCookie)
        .send({ title: 'Renamed by member' })
        .expect(403);
    });

    it('stops a member from updating a task not assigned to them', () => {
      return server()
        .patch(`/api/tasks/${fixtures.unassignedTask.id}`)
        .set('Cookie', memberCookie)
        .send({ status: 'DONE' })
        .expect(403);
    });

    it('lets the owning manager edit any field of a task', async () => {
      const response = await server()
        .patch(`/api/tasks/${fixtures.memberTask.id}`)
        .set('Cookie', managerCookie)
        .send({ title: 'Refined title', priority: 'HIGH' })
        .expect(200);

      expect(response.body.title).toBe('Refined title');
      expect(response.body.priority).toBe('HIGH');
    });

    it('lets an admin delete a task', () => {
      return server()
        .delete(`/api/tasks/${fixtures.memberTask.id}`)
        .set('Cookie', adminCookie)
        .expect(200);
    });

    it('forbids a member from deleting a task', () => {
      return server()
        .delete(`/api/tasks/${fixtures.memberTask.id}`)
        .set('Cookie', memberCookie)
        .expect(403);
    });
  });
});
