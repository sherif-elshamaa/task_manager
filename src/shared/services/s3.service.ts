import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.S3_BUCKET_NAME || 'task-manager-uploads';
  }

  async createPresignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
    metadata?: Record<string, string>;
  }) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn ?? 900,
    });
    return {
      url,
      bucket: this.bucket,
      key: params.key,
      expiresIn: params.expiresIn ?? 900,
    };
  }
}
