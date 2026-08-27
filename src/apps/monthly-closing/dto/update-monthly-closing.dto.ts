import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsOnlyDate } from 'src/common/decorators/is-only-date.decorator';
import { Type } from 'class-transformer';
import { UpdateOperacionalPjDto } from 'src/apps/operacional-pj/dto/update-operacional-pj.dto';
import { UpdatePersonalExpenseDto } from 'src/apps/personal-expenses/dto/update-personal-expense.dto';

export class UpdateMonthlyClosingDto {
  @ApiPropertyOptional({
    description: 'Data de fechamento no formato YYYY-MM-DD',
    example: '2025-01-31',
  })
  @IsOnlyDate()
  @IsOptional()
  closingDate?: string;

  @ApiPropertyOptional({
    description: 'Indica se o fechamento foi concluído',
    example: true,
  })
  @IsOptional()
  isClosing?: boolean;

  @ApiPropertyOptional({
    type: UpdateOperacionalPjDto,
  })
  @IsOptional()
  @Type(() => UpdateOperacionalPjDto)
  operacionalPj?: UpdateOperacionalPjDto;

  @ApiPropertyOptional({
    type: [UpdatePersonalExpenseDto],
  })
  @IsOptional()
  @Type(() => UpdatePersonalExpenseDto)
  personalExpense?: UpdatePersonalExpenseDto[];
}
