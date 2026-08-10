import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOperacionalPjDto {
  @ApiPropertyOptional({
    description: 'Imposto sobre a nota',
    example: 100.5,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsOptional()
  @IsPositive()
  accountFee?: number;

  @ApiPropertyOptional({
    description: 'Contribuição individual (pró-labore, etc.)',
    example: 2000.0,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsOptional()
  @IsPositive()
  individualContribution?: number;

  @ApiPropertyOptional({
    description: 'Total de impostos sobre a nota',
    example: 1500.75,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsOptional()
  @IsPositive()
  totalInvoiceTax?: number;
}
