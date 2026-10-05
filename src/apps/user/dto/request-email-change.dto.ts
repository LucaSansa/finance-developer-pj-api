import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({
    example: 'novo-email@empresa.com',
    description: 'Novo endereço que deverá ser confimado antes da troca',
  })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;
}
