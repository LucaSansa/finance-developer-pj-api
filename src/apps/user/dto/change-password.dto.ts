import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

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
  newPassword: string;
}
