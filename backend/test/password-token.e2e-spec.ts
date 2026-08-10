import { INestApplication } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordTokenService } from '../src/auth/password-token.service';
import { createTestApp, resetDatabase } from './helpers';

describe('PasswordTokenService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: PasswordTokenService;
  let userId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    tokens = app.get(PasswordTokenService);
  });
  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    const user = await prisma.user.create({
      data: { name: 'T', email: 't@test.dev', role: 'MEMBER' },
    });
    userId = user.id;
  });

  it('issues a raw token whose hash is stored (raw not persisted)', async () => {
    const raw = await tokens.issue(userId, TokenType.INVITE);
    expect(raw).toHaveLength(64);
    const row = await prisma.passwordToken.findFirst({ where: { userId } });
    expect(row?.tokenHash).not.toBe(raw);
    expect(row?.type).toBe(TokenType.INVITE);
  });

  it('consumes a valid token once, then rejects reuse', async () => {
    const raw = await tokens.issue(userId, TokenType.RESET);
    const result = await tokens.consume(raw);
    expect(result).toEqual({ userId, type: TokenType.RESET });
    await expect(tokens.consume(raw)).rejects.toThrow('Invalid or expired token');
  });

  it('rejects an unknown token', async () => {
    await expect(tokens.consume('nope')).rejects.toThrow('Invalid or expired token');
    expect(await tokens.check('nope')).toEqual({ valid: false });
  });

  it('rejects an expired token', async () => {
    const raw = await tokens.issue(userId, TokenType.RESET);
    await prisma.passwordToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(tokens.consume(raw)).rejects.toThrow('Invalid or expired token');
  });

  it('invalidates prior unused tokens of the same type on re-issue', async () => {
    const first = await tokens.issue(userId, TokenType.INVITE);
    await tokens.issue(userId, TokenType.INVITE);
    await expect(tokens.consume(first)).rejects.toThrow('Invalid or expired token');
  });

  it('check() returns valid + type for a live token', async () => {
    const raw = await tokens.issue(userId, TokenType.INVITE);
    expect(await tokens.check(raw)).toEqual({ valid: true, type: TokenType.INVITE });
  });
});
