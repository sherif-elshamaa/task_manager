import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { S3Service } from '../shared/services/s3.service';
import { AntivirusService } from '../shared/services/antivirus.service';
import { TasksService } from '../tasks/tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../shared/roles/roles.guard';

describe('FilesController', () => {
  let controller: FilesController;
  let s3: jest.Mocked<S3Service>;
  let av: jest.Mocked<AntivirusService>;
  let tasks: jest.Mocked<TasksService>;

  const mockS3 = {
    createPresignedUploadUrl: jest.fn(),
  } as unknown as jest.Mocked<S3Service>;

  const mockAv = {
    scanS3Object: jest.fn(),
  } as unknown as jest.Mocked<AntivirusService>;

  const mockTasks = {
    addAttachment: jest.fn(),
  } as unknown as jest.Mocked<TasksService>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: S3Service, useValue: mockS3 },
        { provide: AntivirusService, useValue: mockAv },
        { provide: TasksService, useValue: mockTasks },
      ],
    });

    moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });
    moduleBuilder
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<FilesController>(FilesController);
    s3 = module.get(S3Service);
    av = module.get(AntivirusService);
    tasks = module.get(TasksService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('presign', () => {
    it('should return presigned url and scan placeholder', async () => {
      const dto = {
        filename: 'file.png',
        contentType: 'image/png',
        tenantId: 't1',
      };
      mockS3.createPresignedUploadUrl.mockResolvedValue({
        url: 'http://signed',
        bucket: 'b',
        key: 'k',
        expiresIn: 900,
      });

      const res = await controller.presign(dto);

      expect(mockS3.createPresignedUploadUrl).toHaveBeenCalledWith({
        key: expect.stringMatching(/^t1\/\d+-file\.png$/),
        contentType: 'image/png',
      });
      expect(res).toMatchObject({
        url: 'http://signed',
        scan: { clean: true },
      });
    });
  });

  describe('scanCallback', () => {
    it('should attach to task when clean and taskId provided', async () => {
      const dto = {
        bucket: 'b',
        key: 't1/123-file.png',
        clean: true,
        taskId: 'task1',
        filename: 'file.png',
        size: 100,
        mime: 'image/png',
        tenantId: 't1',
      };
      const res = await controller.scanCallback(dto as any);
      expect(tasks.addAttachment).toHaveBeenCalledWith({
        tenantId: 't1',
        taskId: 'task1',
        attachment: {
          key: 't1/123-file.png',
          filename: 'file.png',
          size: 100,
          mime_type: 'image/png',
        },
      });
      expect(res).toEqual({
        recorded: true,
        attachedToTask: 'task1',
        key: 't1/123-file.png',
      });
    });

    it('should do nothing special when not clean', async () => {
      const dto = { bucket: 'b', key: 'k', clean: false } as any;
      const res = await controller.scanCallback(dto);
      expect(tasks.addAttachment).not.toHaveBeenCalled();
      expect(res).toEqual({ recorded: true });
    });

    it('should use key basename as filename fallback', async () => {
      const dto = {
        bucket: 'b',
        key: 't1/abc123',
        clean: true,
        taskId: 'task1',
        tenantId: 't1',
      } as any;
      const res = await controller.scanCallback(dto);
      expect(tasks.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          attachment: expect.objectContaining({ filename: 'abc123' }),
        }),
      );
      expect(res.recorded).toBe(true);
    });
  });
});
