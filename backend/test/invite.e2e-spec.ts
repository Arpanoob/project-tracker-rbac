import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { createTestApp, login, resetDatabase, seedFixtures } from './helpers';

describe('Invite flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: MailService;
  let adminCookie: string;
  const server = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    mail = app.get(MailService);
  });
  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    const fx = await seedFixtures(prisma);
    adminCookie = await login(app, fx.admin.email);
    mail.clearMail();
  });

  it('creates a user without a password and emails an invite', async () => {
    const res = await server()
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({ name: 'Nina New', email: 'nina@test.dev', role: 'MEMBER' })
      .expect(201);

    expect(res.body).not.toHaveProperty('passwordHash');
    const dbUser = await prisma.user.findUnique({ where: { email: 'nina@test.dev' } });
    expect(dbUser?.passwordHash).toBeNull();

    const token = await prisma.passwordToken.findFirst({ where: { userId: dbUser!.id } });
    expect(token?.type).toBe('INVITE');
    expect(mail.getLastMail()?.to).toBe('nina@test.dev');
    expect(mail.getLastMail()?.text).toContain('/set-password?token=');
  });

  it('rejects creating a user with a duplicate email', async () => {
    await server()
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({ name: 'Dup', email: 'admin@test.dev', role: 'MEMBER' })
      .expect(409);
  });

  it('marks a not-yet-onboarded user as pending in the list', async () => {
    await server()
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({ name: 'Nina New', email: 'nina@test.dev', role: 'MEMBER' })
      .expect(201);

    const list = await server().get('/api/users').set('Cookie', adminCookie).expect(200);
    const nina = list.body.find((u: { email: string }) => u.email === 'nina@test.dev');
    const admin = list.body.find((u: { email: string }) => u.email === 'admin@test.dev');
    expect(nina.pending).toBe(true);
    expect(admin.pending).toBe(false);
    expect(nina).not.toHaveProperty('passwordHash');
  });

  it('resends an invite to a pending user and rejects it for an onboarded one', async () => {
    const created = await server()
      .post('/api/users')
      .set('Cookie', adminCookie)
      .send({ name: 'Nina New', email: 'nina@test.dev', role: 'MEMBER' })
      .expect(201);
    mail.clearMail();

    await server()
      .post(`/api/users/${created.body.id}/resend-invite`)
      .set('Cookie', adminCookie)
      .expect(201);
    expect(mail.getLastMail()?.to).toBe('nina@test.dev');
    expect(mail.getLastMail()?.text).toContain('/set-password?token=');

    // An admin (who already has a password) cannot be re-invited.
    const admin = await prisma.user.findUnique({ where: { email: 'admin@test.dev' } });
    await server()
      .post(`/api/users/${admin!.id}/resend-invite`)
      .set('Cookie', adminCookie)
      .expect(400);
  });
});
