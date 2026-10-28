import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 'Empresa XYZ' })
  name: string;

  @Expose()
  @ApiProperty({ example: '11222333000181' })
  cnpj: string;

  @Expose()
  @ApiProperty({ example: 'contato@empresa.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: 8 })
  taxPercentage: number;
}
