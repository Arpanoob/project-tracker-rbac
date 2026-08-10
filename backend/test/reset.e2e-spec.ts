import { INestApplication } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { PasswordTokenService } from '../src/auth/password-token.service';
import { createTestApp, resetDatabase, seedFixtures } from './helpers';

describe('Password set/reset (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: MailService;
  let tokens: PasswordTokenService;
  const server = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    mail = app.get(MailService);
    tokens = app.get(PasswordTokenService);
  });
  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedFixtures(prisma);
    mail.clearMail();
  });

  it('rejects login for a user who has not set a password', async () => {
    const invitee = await prisma.user.create({
      data: { name: 'No Pass', email: 'nopass@test.dev', role: 'MEMBER' },
    });
    const raw = await tokens.issue(invitee.id, TokenType.INVITE);

    await server()
      .post('/api/auth/login')
      .send({ email: 'nopass@test.dev', password: 'whatever1' })
      .expect(401);

    await server()
      .post('/api/auth/set-password')
      .send({ token: raw, password: 'BrandNew123' })
      .expect(200);

    await server()
      .post('/api/auth/login')
      .send({ email: 'nopass@test.dev', password: 'BrandNew123' })
      .expect(200);
  });

  it('forgot-password returns 200 and emails a reset link for a real user', async () => {
    await server()
      .post('/api/auth/forgot-password')
      .send({ email: 'member@test.dev' })
      .expect(200);
    expect(mail.getLastMail()?.text).toContain('/reset-password?token=');
  });

  it('forgot-password returns 200 but sends nothing for an unknown email', async () => {
    await server()
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@test.dev' })
      .expect(200);
    expect(mail.getLastMail()).toBeNull();
  });

  it('rejects set-password with an invalid token', async () => {
    await server()
      .post('/api/auth/set-password')
      .send({ token: 'bogus', password: 'BrandNew123' })
      .expect(400);
  });

  it('GET token check reports validity without consuming', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'member@test.dev' } });
    const raw = await tokens.issue(user!.id, TokenType.RESET);

    const ok = await server().get(`/api/auth/token/${raw}`).expect(200);
    expect(ok.body).toEqual({ valid: true, type: 'RESET' });

    const bad = await server().get('/api/auth/token/nope').expect(200);
    expect(bad.body).toEqual({ valid: false });

    await server()
      .post('/api/auth/set-password')
      .send({ token: raw, password: 'Another123' })
      .expect(200);
  });
});
