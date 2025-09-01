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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../shared/roles/roles.guard';
import { Roles } from '../shared/roles.decorator';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto';
import {
  DataExportRequestDto,
  DataDeletionRequestDto,
} from './dto/data-export.dto';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  create(@Body() createTenantDto: { name: string; plan?: string }) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all tenants (admin only)' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.tenantsService.findAll({ page, limit, search });
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get tenant by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update tenant (admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete tenant (admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Post(':id/data-export')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Export tenant data (GDPR/CCPA compliance)' })
  @ApiResponse({ status: 200, description: 'Data export initiated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  exportData(
    @Param('id') id: string,
    @Body() exportRequest: DataExportRequestDto,
  ) {
    return this.tenantsService.exportData(id, exportRequest);
  }

  @Post(':id/data-deletion')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Request data deletion (GDPR/CCPA compliance)' })
  @ApiResponse({ status: 200, description: 'Data deletion request initiated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  requestDataDeletion(
    @Param('id') id: string,
    @Body() deletionRequest: DataDeletionRequestDto,
  ) {
    return this.tenantsService.requestDataDeletion(id, deletionRequest);
  }

  @Get(':id/data-retention-status')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get data retention status' })
  @ApiResponse({ status: 200, description: 'Data retention status' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  getDataRetentionStatus(@Param('id') id: string) {
    return this.tenantsService.getDataRetentionStatus(id);
  }
}
