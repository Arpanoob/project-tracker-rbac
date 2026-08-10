import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
