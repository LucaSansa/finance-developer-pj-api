import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePersonalExpenseDto {
  @ApiProperty({
    description: 'Nome da despesa pessoal',
    example: 'Aluguel escritório',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição da despesa',
    example: 'Sala comercial centro',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Valor da despesa',
    example: 1200.5,
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @IsNotEmpty()
  @IsPositive()
  value: number;

  // @IsString()
  // @IsNotEmpty()
  // monthlyClosingId: string;

  @ApiProperty({
    description: 'ID do tipo de despesa',
    example: 'uuid-expense-type-123',
  })
  @IsString()
  @IsNotEmpty()
  expenseTypeId: string;
}
