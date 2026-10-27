import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { UpdateInvoiceDto } from 'src/apps/invoice/dto/update-invoice.dto';

export class UpdateOperacionalPjDto {
  @ApiPropertyOptional({
    description: 'Tarifa da conta PJ',
    example: 50.0,
  })
  @Type(() => Number)
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accountFee?: number;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  taxPercentage?: number;

  @ApiPropertyOptional({
    description: 'Contribuição individual',
    example: 2000.0,
  })
  @Type(() => Number)
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  individualContribution?: number;

  @ApiPropertyOptional({
    description: 'Notas fiscais. Quando enviada, substitui a coleção atual.',
    type: [UpdateInvoiceDto],
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @Type(() => UpdateInvoiceDto)
  @ValidateNested({ each: true })
  invoice?: UpdateInvoiceDto[];
}
