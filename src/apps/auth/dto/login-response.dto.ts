import { ApiProperty } from '@nestjs/swagger';

class LoginUserDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  name: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  email: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;
}
