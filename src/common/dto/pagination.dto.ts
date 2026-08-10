import { IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Quantidade de itens por página' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
