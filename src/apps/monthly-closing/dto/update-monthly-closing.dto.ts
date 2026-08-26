import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsOnlyDate } from 'src/common/decorators/is-only-date.decorator';
import { Type } from 'class-transformer';
import { CreateOperacionalPjDto } from 'src/apps/operacional-pj/dto/create-operacional-pj.dto';
import { CreatePersonalExpenseDto } from 'src/apps/personal-expenses/dto/create-personal-expense.dto';

export class UpdateMonthlyClosingDto {
  @ApiPropertyOptional({
    description: 'Data de fechamento no formato YYYY-MM-DD',
    example: '2025-01-31',
  })
  @IsOnlyDate()
  @IsOptional()
  closingDate: string;

  @ApiPropertyOptional({
    description: 'Indica se o fechamento foi concluído',
    example: true,
  })
  @IsOptional()
  isClosing?: boolean;

  @ApiPropertyOptional({
    description: 'Informações operacionais do PJ relacionadas ao fechamento',
    type: CreateOperacionalPjDto,
  })
  @IsOptional()
  @Type(() => CreateOperacionalPjDto)
  operacionalPj?: CreateOperacionalPjDto;

  @ApiPropertyOptional({
    description: 'Despesas pessoais relacionadas ao fechamento',
    type: [CreatePersonalExpenseDto],
  })
  @IsOptional()
  @Type(() => CreatePersonalExpenseDto)
  personalExpense?: CreatePersonalExpenseDto[];
}
