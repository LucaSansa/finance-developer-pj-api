import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'O token de uso único recebido por e-mail pelo usuário',
  })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NovaSenhaForte123!',
    description: 'A nova senha que o usuário deseja registrar para acesso',
  })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @IsString()
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres' })
  password: string;
}
