import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { PrometheusService } from './prometheus.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

describe('MonitoringController', () => {
  let controller: MonitoringController;

  const mockProm = {
    getMetrics: jest.fn(() => '# HELP test'),
  } as Partial<PrometheusService> as PrometheusService;

  const mockRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([1]),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockRunner),
  } as unknown as DataSource;
  const mockConfig = {
    get: jest.fn().mockReturnValue(undefined), // REDIS_URL undefined -> not blocking
  } as Partial<ConfigService> as ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: PrometheusService, useValue: mockProm },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const makeRes = () => {
    const obj = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return obj as unknown as import('express').Response;
  };

  it('should return metrics text', () => {
    const res = makeRes();
    controller.getMetrics(res);
    expect((res as any).set).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect((res as any).status).toHaveBeenCalledWith(200);
    expect((res as any).send).toHaveBeenCalledWith('# HELP test');
  });

  it('should handle metrics error', () => {
    const res = makeRes();
    (mockProm.getMetrics as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    controller.getMetrics(res);
    expect((res as any).status).toHaveBeenCalledWith(500);
    expect((res as any).send).toHaveBeenCalledWith('Error collecting metrics');
  });

  it('should return health json', () => {
    const res = makeRes();
    controller.getHealth(res);
    expect((res as any).status).toHaveBeenCalledWith(200);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'healthy' }),
    );
  });

  it('should return ready json', async () => {
    const res = makeRes();
    await controller.getReady(res);
    expect((res as any).status).toHaveBeenCalledWith(200);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready' }),
    );
  });
});
