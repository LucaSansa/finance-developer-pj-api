import { IsOptional } from 'class-validator';
import { IsOnlyDate } from 'src/common/decorators/is-only-date.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterMonthlyClosingDateDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Data inicial do período (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsOnlyDate()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final do período (YYYY-MM-DD)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsOnlyDate()
  endDate?: string;
}
