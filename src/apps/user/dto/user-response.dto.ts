import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  name: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  email: string;
}
