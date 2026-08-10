import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.tasksService.findAllForUser(user, projectId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.remove(id, user);
  }
}
