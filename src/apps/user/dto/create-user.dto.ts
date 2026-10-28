import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '11222333000181' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{14}$/, {
    message: 'O CNPJ deve conter exatamente 14 dígitos numéricos.',
  })
  cnpj: string;

  @ApiProperty({ example: 'teste@teste.com' })
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

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
