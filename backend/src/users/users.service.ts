import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
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
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: 'asc' },
    });
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash,
      },
      select: publicUserSelect,
    });
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
