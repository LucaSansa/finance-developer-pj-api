import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jhon Due' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: '11222333000181' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{14}$/, {
    message: 'O CNPJ deve conter exatamente 14 dígitos numéricos.',
  })
  cnpj?: string;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  taxPercentage?: number;
}
