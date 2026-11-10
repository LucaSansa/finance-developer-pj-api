import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOperacionalPjDto } from 'src/apps/operacional-pj/dto/create-operacional-pj.dto';
import { CreatePersonalExpenseDto } from 'src/apps/personal-expenses/dto/create-personal-expense.dto';
import { IsOnlyDate } from 'src/common/decorators/is-only-date.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMonthlyClosingDto {
  @ApiProperty({
    description: 'Data de fechamento no formato YYYY-MM-DD',
    example: '2025-01-31',
  })
  @IsOnlyDate()
  @IsNotEmpty()
  closingDate: string;

  @ApiPropertyOptional({
    description: 'Indica se o fechamento foi concluído',
    example: true,
  })
  @IsOptional()
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
    description: 'Informações operacionais do PJ relacionadas ao fechamento',
    type: CreateOperacionalPjDto,
  })
  @IsOptional()
  @Type(() => CreateOperacionalPjDto)
  @ValidateNested()
  operacionalPj?: CreateOperacionalPjDto;

  @ApiPropertyOptional({
    description: 'Despesas pessoais relacionadas ao fechamento',
    type: [CreatePersonalExpenseDto],
  })
  @IsOptional()
  @IsArray()
  @Type(() => CreatePersonalExpenseDto)
  @ValidateNested({ each: true })
  personalExpense?: CreatePersonalExpenseDto[];
}
