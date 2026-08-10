import { INestApplication } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './helpers';

describe('PasswordToken model (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('creates a user with a null passwordHash and a token', async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'Invitee', email: 'invitee@test.dev', role: 'MEMBER' },
    });
    expect(user.passwordHash).toBeNull();

    const token = await prisma.passwordToken.create({
      data: {
        userId: user.id,
        tokenHash: 'deadbeef',
        type: TokenType.INVITE,
        expiresAt: new Date(Date.now() + 1000),
      },
    });
    expect(token.usedAt).toBeNull();
  });
});
