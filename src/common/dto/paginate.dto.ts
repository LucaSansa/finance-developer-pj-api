export class PaginateOptionsDto {
  currentPage: number;

  limitPerPage: number;

  totalItems: number;

  previousPage: number | null;

  nextPage: number | null;
}

export class PaginateDto<T> {
  data: T[];

  pagination: PaginateOptionsDto;
}
