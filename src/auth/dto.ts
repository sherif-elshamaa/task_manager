import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

export class OwnerDto {
  @ApiProperty()
  @IsString()
  first_name!: string;

  @ApiProperty()
  @IsString()
  last_name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 128)
  password!: string;
}

export class SignupDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  tenant_name!: string;

  @ApiProperty({ type: () => OwnerDto })
  @ValidateNested()
  @Type(() => OwnerDto)
  owner!: OwnerDto;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  refresh_token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
