import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('http://signed-url'),
}));

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates presigned upload url', async () => {
    const res = await service.createPresignedUploadUrl({
      key: 'k',
      contentType: 'image/png',
    });
    expect(res).toEqual({
      url: 'http://signed-url',
      bucket: expect.any(String),
      key: 'k',
      expiresIn: 900,
    });
  });
});
