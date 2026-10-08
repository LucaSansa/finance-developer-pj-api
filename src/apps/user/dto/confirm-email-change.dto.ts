import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({ description: 'Token recebido no email novo' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
