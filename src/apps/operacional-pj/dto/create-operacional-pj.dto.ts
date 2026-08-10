import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOperacionalPjDto {
  @ApiProperty({
    description: 'Tarifa da conta PJ',
    example: 50.0,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  @IsPositive()
  accountFee: number;

  @ApiProperty({
    description: 'Contribuição individual (pró-labore, etc.)',
    example: 2000.0,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  @IsPositive()
  individualContribution: number;

  @ApiProperty({
    description: 'Total de impostos sobre a nota',
    example: 1500.75,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  @IsPositive()
  totalInvoiceTax: number;

  // @ApiProperty({
  //   description: 'ID do fechamento mensal associado',
  //   example: 'uuid-fechamento-123',
  // })
  @IsString()
  @IsNotEmpty()
  monthlyClosingId: string;
}
