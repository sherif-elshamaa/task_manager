import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { TenantGuard } from '../shared/tenant/tenant.guard';
import { RolesGuard } from '../shared/roles/roles.guard';
import { Roles } from '../shared/roles.decorator';
import { CurrentUser } from '../shared/current-user.decorator';
import type { CurrentUserPayload } from '../shared/current-user.decorator';
import { PaginationQueryDto } from '../shared/dto';
import { ApiErrorResponses, ApiPaginatedResponse } from '../shared/swagger';
import { ActivityLogResponseDto } from './dto';

@ApiTags('Activity Logs')
@Controller('activity')
@UseGuards(TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiErrorResponses()
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get tenant activity logs (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'resource_type', required: false, type: String })
  @ApiQuery({ name: 'resource_id', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiPaginatedResponse(ActivityLogResponseDto, 'Activity logs')
  async getActivityLogs(
    @Query()
    query: PaginationQueryDto & {
      resource_type?: string;
      resource_id?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const { resource_type, resource_id, action } = query as typeof query & {
      action?: string;
    };
    const page =
      typeof query.page === 'number' ? query.page : Number(query.page ?? 1);
    const limit =
      typeof query.limit === 'number' ? query.limit : Number(query.limit ?? 20);
    const tenant_id = user.tenant_id as string;

    return await this.activityLogsService.findByTenant(
      tenant_id,
      page,
      limit,
      resource_type,
      resource_id,
      action,
    );
  }

  // Methods used by unit tests
  async findAll(
    tenant: { tenantId: string },
    page: number = 1,
    limit: number = 10,
    resourceType?: string,
    resourceId?: string,
    action?: string,
  ) {
    return this.activityLogsService.findAll({
      tenantId: tenant.tenantId,
      page,
      limit,
      resourceType,
      resourceId,
      action,
    });
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    tenant: { tenantId: string },
    page: number = 1,
    limit: number = 10,
  ) {
    return this.activityLogsService.findByResource({
      tenantId: tenant.tenantId,
      resourceType,
      resourceId,
      page,
      limit,
    });
  }
}
