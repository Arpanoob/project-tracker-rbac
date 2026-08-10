import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PasswordTokenService } from '../auth/password-token.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: PasswordTokenService,
    private readonly mail: MailService,
  ) {}

  async findAll(query: ListUsersDto) {
    const { search, page, pageSize } = query;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...publicUserSelect, passwordHash: true },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Expose a "pending" flag (no password set yet) without leaking the hash.
    const data = rows.map(({ passwordHash, ...user }) => ({
      ...user,
      pending: passwordHash === null,
    }));

    return { data, total, page, pageSize };
  }

  directory() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: null,
      },
      select: publicUserSelect,
    });

    const rawToken = await this.tokens.issue(user.id, TokenType.INVITE);
    await this.mail.sendInvite(user.email, user.name, rawToken);

    return user;
  }

  async resendInvite(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      throw new BadRequestException('This user has already set their password');
    }

    const rawToken = await this.tokens.issue(user.id, TokenType.INVITE);
    await this.mail.sendInvite(user.email, user.name, rawToken);

    return { message: 'Invite email sent' };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const clash = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });

      if (clash) {
        throw new ConflictException('A user with that email already exists');
      }
    }

    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted' };
  }
}
