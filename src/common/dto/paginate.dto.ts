// import { ApiProperty } from '@nestjs/swagger';

export class PaginateOptionsDto {
  // @ApiProperty()
  currentPage: number;

  // @ApiProperty()
  limitPerPage: number;

  // @ApiProperty()
  totalItems: number;

  // @ApiProperty()
  previousPage: number | null;

  // @ApiProperty()
  nextPage: number | null;
}

export class PaginateDto<T> {
  // @ApiProperty()
  data: T[];

  // @ApiProperty()
  pagination: PaginateOptionsDto;
}
