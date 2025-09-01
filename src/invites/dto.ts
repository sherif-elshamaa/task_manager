import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Email of the person to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'ID of the workspace to invite to',
    example: 'uuid-here',
  })
  @IsUUID()
  @IsNotEmpty()
  workspaceId!: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: ['admin', 'member'],
    example: 'member',
  })
  @IsEnum(['admin', 'member'])
  @IsNotEmpty()
  role!: 'admin' | 'member';
}

export class UpdateInviteDto {
  @ApiProperty({
    description: 'New status for the invitation',
    enum: ['pending', 'accepted', 'declined'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined'])
  status?: 'pending' | 'accepted' | 'declined';

  @ApiProperty({
    description: 'New role for the invitation',
    enum: ['admin', 'member'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['admin', 'member'])
  role?: 'admin' | 'member';
}

export class InviteResponseDto {
  @ApiProperty({ description: 'Invite ID' })
  invite_id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenant_id!: string;

  @ApiProperty({ description: 'Email of the invited person' })
  email!: string;

  @ApiProperty({ description: 'Type of resource' })
  resource_type!: string;

  @ApiProperty({ description: 'ID of the resource' })
  resource_id!: string;

  @ApiProperty({ description: 'Role to be assigned' })
  role!: string;

  @ApiProperty({ description: 'Current status' })
  status!: string;

  @ApiProperty({ description: 'Invited by user ID' })
  invited_by!: string;

  @ApiProperty({ description: 'Expiration timestamp' })
  expires_at!: Date;

  @ApiProperty({ description: 'Acceptance timestamp', required: false })
  accepted_at?: Date;

  @ApiProperty({ description: 'Decline timestamp', required: false })
  declined_at?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at!: Date;
}

export class ListInvitesQueryDto {
  @ApiProperty({
    description: 'Offset for pagination',
    required: false,
    example: 0,
  })
  @IsOptional()
  offset?: number;

  @ApiProperty({
    description: 'Limit for pagination',
    required: false,
    example: 10,
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: 'Filter by status',
    enum: ['pending', 'accepted', 'declined'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined'])
  status?: 'pending' | 'accepted' | 'declined';
}
