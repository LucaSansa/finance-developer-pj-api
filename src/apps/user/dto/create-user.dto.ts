import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '12345678000199' })
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

  @ApiProperty({
    description:
      'Nova senha: de 8 a 12 caracteres, com maiúscula, minúscula, número e símbolo',
    example: 'Senha@123',
    minLength: 8,
    maxLength: 12,
  })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(12, { message: 'A nova senha deve ter no máximo 12 caracteres.' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'A nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo.',
    },
  )
  password: string;
}
