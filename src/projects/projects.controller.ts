import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../shared/roles.decorator';
import { RolesGuard } from '../shared/roles/roles.guard';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  PaginatedProjectAdminResponseDto,
} from './dto';
import { CurrentUser } from '../shared/current-user.decorator';
import { WorkspaceMemberGuard } from '../shared/guards/workspace-member.guard';
import { ApiErrorResponses, ApiPaginatedResponse } from '../shared/swagger';

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
}

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiErrorResponses()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create({
      tenantId: user.tenantId,
      userId: user.sub,
      workspaceId: createProjectDto.workspace_id,
      dto: createProjectDto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for current tenant' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiPaginatedResponse(ProjectResponseDto, 'List of projects')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll({
      tenantId: user.tenantId,
      query: { page, limit, search },
    });
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all projects across all tenants (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all projects' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiOkResponse({ type: PaginatedProjectAdminResponseDto })
  findAllAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.projectsService.list({
      tenantId: tenantId || 'all',
      page,
      limit,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ProjectResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findOne({ tenantId: user.tenantId, id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ProjectResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update({
      tenantId: user.tenantId,
      id,
      dto: updateProjectDto,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean', example: true } },
    },
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.remove({ tenantId: user.tenantId, id });
  }
}
