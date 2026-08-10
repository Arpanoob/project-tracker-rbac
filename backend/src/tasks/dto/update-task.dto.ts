import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
