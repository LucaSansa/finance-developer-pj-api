import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Jhon Due' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '12345678000199' })
  @IsOptional()
  @IsString()
  cnpj?: string;
}
