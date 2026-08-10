import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, login, resetDatabase, seedFixtures } from './helpers';

describe('Audit log (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let managerCookie: string;
  const server = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    const fx = await seedFixtures(prisma);
    adminCookie = await login(app, fx.admin.email);
    managerCookie = await login(app, fx.manager.email);
  });

  it('records a mutating request with actor, action and entity', async () => {
    await server()
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({ name: 'Logged User', email: 'logged@test.dev', role: 'MEMBER' })
      .expect(201);

    const res = await server().get('/api/audit-logs').set('Cookie', adminCookie).expect(200);
    const entry = res.body.data.find(
      (l: { path: string }) => l.path === '/api/users',
    );
    expect(entry.action).toBe('CREATE');
    expect(entry.entity).toBe('users');
    expect(entry.userEmail).toBe('admin@test.dev');
    expect(entry.statusCode).toBe(201);
  });

  it('does not record read-only requests', async () => {
    await server().get('/api/users').set('Cookie', adminCookie).expect(200);
    const res = await server().get('/api/audit-logs').set('Cookie', adminCookie).expect(200);
    const gets = res.body.data.filter((l: { method: string }) => l.method === 'GET');
    expect(gets).toHaveLength(0);
  });

  it('is admin-only and paginates', async () => {
    await server().get('/api/audit-logs').set('Cookie', managerCookie).expect(403);

    const res = await server()
      .get('/api/audit-logs?page=1&pageSize=5')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('pageSize', 5);
  });
});
