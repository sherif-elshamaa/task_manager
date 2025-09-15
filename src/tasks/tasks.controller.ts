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
  NotFoundException,
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
import { RolesGuard } from '../shared/roles/roles.guard';
import { Roles } from '../shared/roles.decorator';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AssignTaskDto,
  TaskResponseDto,
} from './dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../shared/current-user.decorator';
import { ApiErrorResponses, ApiPaginatedResponse } from '../shared/swagger';

@ApiTags('tasks')
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiErrorResponses()
@ApiParam({ name: 'projectId', type: String })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.create({
      tenantId: user.tenantId!,
      userId: user.sub!,
      projectId: projectId,
      dto: createTaskDto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for current tenant' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'assigned_to', required: false, type: String })
  @ApiPaginatedResponse(TaskResponseDto, 'List of tasks')
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigned_to') assignedTo?: string,
  ) {
    return this.tasksService.list({
      tenantId: user.tenantId!,
      projectId,
      status,
      priority,
      search,
      assignedTo,
      page,
      limit,
    });
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all tasks across all tenants (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all tasks' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiPaginatedResponse(TaskResponseDto, 'List of all tasks')
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.tasksService.listAll({
      page,
      limit,
      search,
      tenantId,
      projectId,
      status,
      priority,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.findOne(user.tenantId!, id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.update({
      tenantId: user.tenantId!,
      userId: user.sub!,
      taskId: id,
      dto: updateTaskDto,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean', example: true },
        task_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.remove({ tenantId: user.tenantId!, id });
  }

  @Post('/:taskId/assign')
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  assignTask(
    @Param('taskId') taskId: string,
    @Body() assignDto: AssignTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.update({
      tenantId: user.tenantId!,
      userId: user.sub!,
      taskId,
      dto: { assigned_to: assignDto.assigned_to } as UpdateTaskDto,
    });
  }

  @Post('/:taskId/attachments')
  @ApiOperation({ summary: 'Upload attachment to task' })
  @ApiResponse({ status: 200, description: 'Attachment uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  uploadAttachment() {
    // Advise using /files/presign for upload, then register attachment via update/addAttachment
    return {
      message:
        'Use /files/presign then call PATCH /tasks/:id with attachments or use addAttachment API',
    };
  }

  @Delete('/:taskId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete attachment from task' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiParam({ name: 'attachmentId', type: String })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean', example: true } },
    },
  })
  deleteAttachment(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.removeAttachment({
      tenantId: user.tenantId!,
      taskId,
      key: attachmentId,
    });
  }
}
