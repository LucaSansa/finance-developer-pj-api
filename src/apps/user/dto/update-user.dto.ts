import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Jhon Due' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '12345678000199' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  taxPercentage?: number;
}
