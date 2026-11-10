import { ApiProperty } from '@nestjs/swagger';

class LoginUserDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  name: string;

  @ApiProperty({ example: '11222333000181' })
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
