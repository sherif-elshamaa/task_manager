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
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto } from './dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../shared/current-user.decorator';
import { ApiErrorResponses, ApiPaginatedResponse } from '../shared/swagger';

@ApiTags('comments')
@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiErrorResponses()
@ApiParam({ name: 'taskId', type: String })
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiCreatedResponse({ type: CommentResponseDto })
  create(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentsService.create({
      tenantId: user.tenantId!,
      userId: user.sub!,
      taskId,
      dto: { text: createCommentDto.text },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiPaginatedResponse(CommentResponseDto, 'List of comments')
  findAll(
    @Param('taskId') taskId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.list({
      tenantId: user.tenantId!,
      taskId,
      page,
      limit,
    });
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all comments across all tenants (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all comments' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  @ApiPaginatedResponse(CommentResponseDto, 'List of all comments')
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('tenantId') tenantId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.commentsService.listAll({
      page,
      limit,
      tenantId,
      taskId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment details' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CommentResponseDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.commentsService.findOne({
      tenantId: user.tenantId!,
      commentId: id,
    });
    if (!result) {
      throw new NotFoundException('Comment not found');
    }
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CommentResponseDto })
  update(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentsService.update({
      commentId: id,
      tenantId: user.tenantId!,
      userId: user.sub!,
      taskId,
      dto: { text: updateCommentDto.text },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean', example: true } },
    },
  })
  remove(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentsService.remove({
      tenantId: user.tenantId!,
      userId: user.sub!,
      taskId,
      commentId: id,
    });
  }
}
