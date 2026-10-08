import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 'Empresa XYZ' })
  name: string;

  @Expose()
  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @Expose()
  @ApiProperty({ example: 'contato@empresa.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: 8 })
  taxPercentage: number;
}
