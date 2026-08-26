import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateInvoiceDto } from 'src/apps/invoice/dto/create-invoice.dto';

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

  @ApiPropertyOptional({
    description: 'Nota fiscal',
    type: [CreateInvoiceDto],
  })
  @IsOptional()
  @Type(() => CreateInvoiceDto)
  invoice?: CreateInvoiceDto[];

  @IsString()
  @IsNotEmpty()
  monthlyClosingId: string;
}
