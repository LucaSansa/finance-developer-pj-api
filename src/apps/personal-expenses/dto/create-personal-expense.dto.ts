import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
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

  @ApiProperty({
    description: 'ID do tipo de despesa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  expenseTypeId: string;
}
