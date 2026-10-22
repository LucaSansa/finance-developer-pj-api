import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateInvoiceDto } from 'src/apps/invoice/dto/create-invoice.dto';
export class CreateOperacionalPjDto {
  @ApiPropertyOptional({
    description: 'Tarifa da conta PJ',
    example: 50.0,
    default: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accountFee?: number;

  @ApiPropertyOptional({
    description: 'Contribuição individual',
    example: 2000.0,
    default: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  individualContribution?: number;

  @ApiProperty({ example: 6, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  taxPercentage?: number;

  @ApiPropertyOptional({
    description: 'Notas fiscais',
    type: [CreateInvoiceDto],
  })
  @IsOptional()
  @Type(() => CreateInvoiceDto)
  invoice?: CreateInvoiceDto[];
}
