import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateInvoiceDto {
  @ApiProperty({
    description: 'Valor da nota fiscal',
    example: 15000.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @IsPositive()
  value: number;
}
