import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const TTL_MS: Record<TokenType, number> = {
  INVITE: 72 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
};

@Injectable()
export class PasswordTokenService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async issue(userId: string, type: TokenType): Promise<string> {
    await this.prisma.passwordToken.deleteMany({
      where: { userId, type, usedAt: null },
    });

    const raw = randomBytes(32).toString('hex');
    await this.prisma.passwordToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + TTL_MS[type]),
      },
    });
    return raw;
  }

  async consume(rawToken: string): Promise<{ userId: string; type: TokenType }> {
    const row = await this.prisma.passwordToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.passwordToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return { userId: row.userId, type: row.type };
  }

  async check(rawToken: string): Promise<{ valid: boolean; type?: TokenType }> {
    const row = await this.prisma.passwordToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return { valid: false };
    }
    return { valid: true, type: row.type };
  }
}
