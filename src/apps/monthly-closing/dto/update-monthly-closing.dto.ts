import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsOnlyDate } from 'src/common/decorators/is-only-date.decorator';
import { Type } from 'class-transformer';
import { UpdateOperacionalPjDto } from 'src/apps/operacional-pj/dto/update-operacional-pj.dto';
import { UpdatePersonalExpenseDto } from 'src/apps/personal-expenses/dto/update-personal-expense.dto';

export class UpdateMonthlyClosingDto {
  @ApiPropertyOptional({
    description: 'Data de fechamento no formato YYYY-MM-DD',
    example: '2025-01-31',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsOnlyDate()
  closingDate?: string;

  @ApiPropertyOptional({
    description: 'Indica se o fechamento foi concluído',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isClosing?: boolean;

  @ApiPropertyOptional({ example: 6, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercentage?: number;

  @ApiPropertyOptional({
    type: UpdateOperacionalPjDto,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @Type(() => UpdateOperacionalPjDto)
  @ValidateNested()
  operacionalPj?: UpdateOperacionalPjDto;

  @ApiPropertyOptional({
    type: [UpdatePersonalExpenseDto],
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @Type(() => UpdatePersonalExpenseDto)
  @ValidateNested({ each: true })
  personalExpense?: UpdatePersonalExpenseDto[];
}
