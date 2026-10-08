import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
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

  @ApiProperty({ example: 'teste@teste.com' })
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  taxPercentage: number;

  @ApiProperty({ example: 'teste123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
