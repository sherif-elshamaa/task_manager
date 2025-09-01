import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../shared/roles/roles.guard';
import { S3Service } from '../shared/services/s3.service';
import { AntivirusService } from '../shared/services/antivirus.service';
import { TasksService } from '../tasks/tasks.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { CurrentUserPayload } from '../shared/current-user.decorator';
import { ApiErrorResponses } from '../shared/swagger';
import {
  PresignRequestDto,
  PresignResponseDto,
  ScanCallbackDto,
  ScanCallbackResultDto,
} from './dto';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiErrorResponses()
@Controller('files')
export class FilesController {
  constructor(
    private readonly s3: S3Service,
    private readonly av: AntivirusService,
    private readonly tasksService: TasksService,
  ) {}

  @Post('presign')
  @ApiOperation({ summary: 'Create a presigned S3 upload URL' })
  @ApiResponse({ status: 200, description: 'Presigned URL created' })
  @ApiResponse({ status: 400, description: 'Invalid file parameters' })
  @ApiOkResponse({ type: PresignResponseDto })
  async presign(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PresignRequestDto,
  ) {
    // Validate file parameters
    if (!dto.fileName || !dto.contentType || !dto.size) {
      throw new BadRequestException(
        'fileName, contentType, and size are required',
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (dto.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 100MB');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(dto.contentType)) {
      throw new BadRequestException('File type not allowed');
    }

    // Sanitize filename
    const sanitizedFilename = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${user.tenantId}/${Date.now()}-${sanitizedFilename}`;

    const metadata = {
      tenantId: user.tenantId || '',
      taskId: dto.taskId || '',
      uploadedBy: user.user_id || '',
      originalFilename: dto.fileName,
    };

    try {
      const signed = await this.s3.createPresignedUploadUrl({
        key,
        contentType: dto.contentType,
        metadata,
      });

      // Trigger antivirus scan
      void this.av.scanS3Object(signed.bucket, signed.key);

      return signed;
    } catch (_error) {
      throw new BadRequestException('Failed to create upload URL');
    }
  }

  @Post('scan-callback')
  @ApiOperation({ summary: 'Finalize AV scan and mark file clean/blocked' })
  @ApiResponse({ status: 200, description: 'Scan status recorded' })
  @ApiOkResponse({ type: ScanCallbackResultDto })
  async scanCallback(@Body() dto: ScanCallbackDto) {
    // Here we can update DB state (e.g., attach to a task) if clean
    if (dto.clean && dto.taskId && dto.tenantId) {
      await this.tasksService.addAttachment({
        tenantId: dto.tenantId,
        taskId: dto.taskId,
        attachment: {
          key: dto.key,
          filename: dto.filename || dto.key.split('/').pop() || 'file',
          size: dto.size || 0,
          mime_type: dto.mime || 'application/octet-stream',
        },
      });
      return { recorded: true, attachedToTask: dto.taskId, key: dto.key };
    }
    return { recorded: true };
  }
}
