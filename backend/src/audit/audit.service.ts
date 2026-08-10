import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

interface AuditRequest {
  method: string;
  path: string;
  params?: Record<string, string>;
  user?: { id: string; email: string };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget: an audit write must never break the request it records. */
  async record(req: AuditRequest, statusCode: number): Promise<void> {
    try {
      // "/api/users/123" -> ["users", "123"]
      const segments = req.path.replace(/^\/api\//, '').split('/').filter(Boolean);
      const entity = segments[0] ?? 'unknown';

      await this.prisma.auditLog.create({
        data: {
          userId: req.user?.id ?? null,
          userEmail: req.user?.email ?? null,
          action: ACTION_BY_METHOD[req.method] ?? req.method,
          entity,
          entityId: req.params?.id ?? null,
          method: req.method,
          path: req.path,
          statusCode,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${(err as Error).message}`);
    }
  }

  async findAll(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const where: Prisma.AuditLogWhereInput = {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
