import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class DataExportRequestDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' = 'json';
}

export class DataDeletionRequestDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  retention_period?: string; // e.g., "30d", "6m", "1y"
}
