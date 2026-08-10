import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePersonalExpenseDto {
  @ApiPropertyOptional({
    description: 'Nome da despesa pessoal',
    example: 'Aluguel escritório',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descrição da despesa',
    example: 'Sala comercial centro',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Valor da despesa',
    example: 1200.5,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsOptional()
  @IsPositive()
  value?: number;

  @ApiPropertyOptional({
    description: 'ID do tipo de despesa',
    example: 'uuid-expense-type-123',
  })
  @IsString()
  @IsOptional()
  expenseTypeId?: string;
}
