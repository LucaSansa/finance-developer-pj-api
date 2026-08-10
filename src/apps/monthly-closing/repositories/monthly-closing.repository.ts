import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repositories/base-repository';
import { MonthlyClosing } from '../entities/monthly-closing.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate } from 'src/common/helpers/paginate.helper';
import { FilterMonthlyClosingDateDto } from '../dto/filter-monthly-closing-date.dto';

@Injectable()
export class MonthlyClosingRepository extends BaseRepository<MonthlyClosing> {
  constructor(
    @InjectRepository(MonthlyClosing)
    private readonly repository: BaseRepository<MonthlyClosing>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findAllByUser(userId: string, dto: FilterMonthlyClosingDateDto) {
    const { page = 1, limit = 10, startDate, endDate } = dto;

    const query = this.createQueryBuilder('monthlyClosing')
      .leftJoin('monthlyClosing.operacionalPj', 'operacionalPj')
      .leftJoin('monthlyClosing.personalExpense', 'personalExpense')
      .leftJoin('personalExpense.expenseType', 'expenseType')
      .where('monthlyClosing.userId = :userId', { userId });

    if (startDate) {
      query.andWhere('monthlyClosing.closingDate >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query.andWhere('monthlyClosing.closingDate <= :endDate', {
        endDate,
      });
    }

    query.select([
      'monthlyClosing.id',
      'monthlyClosing.closingDate',
      'monthlyClosing.amountCollected',
      'monthlyClosing.isClosing',
      'operacionalPj.id',
      'operacionalPj.accountFee',
      'operacionalPj.individualContribution',
      'operacionalPj.totalInvoiceTax',
      'personalExpense.id',
      'personalExpense.description',
      'personalExpense.value',
      'expenseType.id',
      'expenseType.name',
    ]);

    query.orderBy('monthlyClosing.closingDate', 'DESC');

    return paginate(query, page, limit);
  }

  async findOneById(id: string) {
    const query = this.createQueryBuilder('monthlyClosing')
      .leftJoin('monthlyClosing.operacionalPj', 'operacionalPj')
      .leftJoin('monthlyClosing.personalExpense', 'personalExpense')
      .leftJoin('personalExpense.expenseType', 'expenseType')
      .where('monthlyClosing.id = :id', { id });

    query.select([
      'monthlyClosing.id',
      'monthlyClosing.closingDate',
      'monthlyClosing.amountCollected',
      'monthlyClosing.isClosing',
      'operacionalPj.id',
      'operacionalPj.accountFee',
      'operacionalPj.individualContribution',
      'operacionalPj.totalInvoiceTax',
      'personalExpense.id',
      'personalExpense.description',
      'personalExpense.value',
      'expenseType.id',
      'expenseType.name',
    ]);
    return query.getOne();
  }
}
