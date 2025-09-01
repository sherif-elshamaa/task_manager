import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceRoleGuard } from '../shared/guards/workspace-role.guard';
import { InviteRoleGuard } from './guards/invite-role.guard';
import { InvitesService } from './invites.service';
import { Roles } from '../shared/roles.decorator';
import { TenantContextService } from '../shared/tenant-context/tenant-context.service';
import { ForbiddenException } from '@nestjs/common';
import {
  CreateInviteDto,
  UpdateInviteDto,
  InviteResponseDto,
  ListInvitesQueryDto,
} from './dto';
import { ApiErrorResponses } from '../shared/swagger';

@ApiTags('invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invites')
@ApiErrorResponses()
export class InvitesController {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  @UseGuards(WorkspaceRoleGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a new invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: InviteResponseDto,
  })
  @ApiCreatedResponse({ type: InviteResponseDto })
  async create(@Body() dto: CreateInviteDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    if (!tenantId || !userId) throw new ForbiddenException('Unauthorized');
    return this.invitesService.create({
      tenantId,
      userId,
      email: dto.email,
      workspaceId: dto.workspaceId,
      role: dto.role,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'accepted', 'declined'],
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        invites: {
          type: 'array',
          items: { $ref: '#/components/schemas/InviteResponseDto' },
        },
        total: { type: 'number' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAll(@Query() query: ListInvitesQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new ForbiddenException('Unauthorized');
    return this.invitesService.findAll({ tenantId, query });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific invitation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: InviteResponseDto,
  })
  @ApiOkResponse({ type: InviteResponseDto })
  async findOne(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new ForbiddenException('Unauthorized');
    return this.invitesService.findOne({ tenantId, id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invitation (e.g., accept/decline)' })
  @ApiResponse({
    status: 200,
    description: 'Invitation updated successfully',
    type: InviteResponseDto,
  })
  @ApiOkResponse({ type: InviteResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateInviteDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    if (!tenantId || !userId) throw new ForbiddenException('Unauthorized');
    const updated = await this.invitesService.update({
      tenantId,
      userId,
      id,
      dto,
    });
    if (!updated)
      throw new ForbiddenException('Resource not found or cross-tenant access');
    return updated;
  }

  @Delete(':id')
  @UseGuards(InviteRoleGuard)
  @Roles('owner', 'admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel/delete an invitation' })
  @ApiResponse({
    status: 204,
    description: 'Invitation cancelled successfully',
  })
  async remove(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    if (!tenantId || !userId) throw new ForbiddenException('Unauthorized');
    await this.invitesService.remove({ tenantId, userId, id });
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { accepted: { type: 'boolean', example: true } },
    },
  })
  async accept(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const email = this.tenantContext.getEmail();
    if (!tenantId || !userId || !email)
      throw new ForbiddenException('Unauthorized');
    return this.invitesService.accept({ tenantId, userId, email, id });
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation declined successfully' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { declined: { type: 'boolean', example: true } },
    },
  })
  async decline(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const email = this.tenantContext.getEmail();
    if (!tenantId || !userId || !email)
      throw new ForbiddenException('Unauthorized');
    return this.invitesService.decline({ tenantId, userId, email, id });
  }
}
