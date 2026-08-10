import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  @IsNotEmpty()
  @IsString()
  cnpj: string;

  @ApiProperty({ example: 'contato@empresa.com' })
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
