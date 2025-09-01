import { Test, TestingModule } from '@nestjs/testing';
import { AntivirusService } from './antivirus.service';

describe('AntivirusService', () => {
  let service: AntivirusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AntivirusService],
    }).compile();

    service = module.get(AntivirusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('scanS3Object returns clean by default', async () => {
    const res = await service.scanS3Object('b', 'k');
    expect(res).toEqual({ clean: true });
  });
});
