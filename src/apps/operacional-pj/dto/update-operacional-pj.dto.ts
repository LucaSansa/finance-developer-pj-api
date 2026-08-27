import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';
import { UpdateInvoiceDto } from 'src/apps/invoice/dto/update-invoice.dto';

export class UpdateOperacionalPjDto {
  @ApiPropertyOptional({
    description: 'Tarifa da conta PJ',
    example: 50.0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  accountFee?: number;

  @ApiPropertyOptional({
    description: 'Contribuição individual',
    example: 2000.0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  individualContribution?: number;

  @ApiPropertyOptional({
    description: 'Notas fiscais. Quando enviada, substitui a coleção atual.',
    type: [UpdateInvoiceDto],
  })
  @IsOptional()
  @Type(() => UpdateInvoiceDto)
  invoice?: UpdateInvoiceDto[];
}
