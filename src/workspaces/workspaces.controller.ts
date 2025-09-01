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
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey } from '@nestjs/cache-manager';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddMemberDto,
  WorkspaceResponseDto,
  WorkspaceMemberResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtPayload } from '../auth/jwt.strategy';
import { WorkspaceRoleGuard } from '../shared/guards/workspace-role.guard';
import { Roles } from '../shared/roles.decorator';
import { WorkspaceMemberGuard } from '../shared/guards/workspace-member.guard';
import { Request } from 'express';
import { ApiErrorResponses, ApiPaginatedResponse } from '../shared/swagger';

@ApiTags('workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiErrorResponses()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiCreatedResponse({
    description: 'Workspace created successfully',
    type: WorkspaceResponseDto,
  })
  create(@Req() req: Request, @Body() dto: CreateWorkspaceDto) {
    const { tenantId, sub: userId } = req.user as JwtPayload;
    return this.workspacesService.create({ tenantId, userId, dto });
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiPaginatedResponse(WorkspaceResponseDto, 'List of workspaces')
  findAll(
    @Req() req: Request,
    @Query() query: { page?: number; limit?: number; search?: string },
  ) {
    const { tenantId } = req.user as JwtPayload;
    return this.workspacesService.findAll({ tenantId, query });
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get all workspaces across all tenants (admin only)',
  })
  @ApiResponse({ status: 200, description: 'List of all workspaces' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  findAllAdmin() {
    // This would need to be implemented in the service
    return { message: 'Admin workspaces endpoint to be implemented' };
  }

  @Get(':id')
  @UseGuards(WorkspaceMemberGuard)
  @CacheKey('get_workspace')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiOkResponse({
    description: 'Workspace details',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as JwtPayload;
    return this.workspacesService.findOne({ tenantId, workspaceId: id });
  }

  @Patch(':id')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRoleGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiOkResponse({
    description: 'Workspace updated successfully',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const { tenantId, sub: userId } = req.user as JwtPayload;
    return this.workspacesService.update({
      tenantId,
      userId,
      workspaceId: id,
      dto,
    });
  }

  @Delete(':id')
  @UseGuards(WorkspaceMemberGuard, WorkspaceRoleGuard)
  @Roles('owner')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiOkResponse({
    description: 'Workspace deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  remove(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, sub: userId } = req.user as JwtPayload;
    return this.workspacesService.remove({
      tenantId,
      userId,
      workspaceId: id,
    });
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a workspace' })
  @ApiCreatedResponse({
    description: 'Member added successfully',
    type: WorkspaceMemberResponseDto,
  })
  addMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    const { tenantId, sub: userId } = req.user as JwtPayload;
    return this.workspacesService.addMember({
      tenantId,
      userId,
      workspaceId: id,
      dto,
    });
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a workspace' })
  @ApiOkResponse({
    description: 'Member removed successfully',
    schema: {
      type: 'object',
      properties: {
        removed: { type: 'boolean', example: true },
      },
    },
  })
  removeMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    const { tenantId, sub: userId } = req.user as JwtPayload;
    return this.workspacesService.removeMember({
      tenantId,
      userId,
      workspaceId: id,
      memberId,
    });
  }

  @Get(':id/members')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Get all members of a workspace' })
  @ApiOkResponse({
    description: 'List of workspace members',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string', format: 'uuid' },
              role: { type: 'string' },
            },
            required: ['user_id', 'role'],
          },
        },
      },
    },
  })
  findAllMembers(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = req.user as JwtPayload;
    return this.workspacesService.findAllMembers({ tenantId, workspaceId: id });
  }
}
