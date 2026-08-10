import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginateDto } from '../dto/paginate.dto';

/**
 * Paginação padrão usando getMany()
 */
export async function paginate<T extends ObjectLiteral>(
  snapshot: SelectQueryBuilder<T>,
  page = 1,
  limit = 10,
): Promise<PaginateDto<T>> {
  const skip = (page - 1) * limit;

  const totalItems = await snapshot.getCount();
  const totalPages = Math.ceil(totalItems / limit);

  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const data = await snapshot.skip(skip).take(limit).getMany();

  return {
    data,
    pagination: {
      currentPage: page,
      limitPerPage: limit,
      totalItems,
      previousPage,
      nextPage,
    },
  };
}

type PaginateRawParams<T extends ObjectLiteral> = {
  snapshot: SelectQueryBuilder<T>;
  page?: number;
  limit?: number;
  mappedFields?: Record<string, string>;
  transformFields?: Record<string, (val: any) => any>;
};

/**
 * Paginação com suporte a RAW + entities
 */
export async function paginateRaw<T extends ObjectLiteral>({
  snapshot,
  page = 1,
  limit = 10,
  mappedFields = {},
  transformFields = {},
}: PaginateRawParams<T>): Promise<PaginateDto<T & Record<string, any>>> {
  const skip = (page - 1) * limit;

  const totalItems = await snapshot.getCount();
  const totalPages = Math.ceil(totalItems / limit);

  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const { raw, entities } = await snapshot
    .skip(skip)
    .take(limit)
    .getRawAndEntities();

  const data = entities.map((entity, index) => {
    const rawItem = raw[index] ?? {};

    const extras = Object.entries(mappedFields).reduce(
      (acc, [rawKey, targetKey]) => {
        if (Object.prototype.hasOwnProperty.call(rawItem, rawKey)) {
          const rawValue = rawItem[rawKey];
          const transformer = transformFields[targetKey];
          acc[targetKey] = transformer ? transformer(rawValue) : rawValue;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      ...entity,
      ...extras,
    };
  });

  return {
    data,
    pagination: {
      currentPage: page,
      limitPerPage: limit,
      totalItems,
      previousPage,
      nextPage,
    },
  };
}
