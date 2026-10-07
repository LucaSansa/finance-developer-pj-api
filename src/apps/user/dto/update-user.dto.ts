import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Jhon Due' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  cnpj?: string;
}
