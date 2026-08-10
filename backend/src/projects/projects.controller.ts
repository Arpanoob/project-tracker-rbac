import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOneForUser(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.MANAGER)
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.MANAGER)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.removeMember(id, userId, user);
  }
}
