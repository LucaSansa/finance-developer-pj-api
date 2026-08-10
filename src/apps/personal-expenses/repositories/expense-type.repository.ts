import { Injectable } from '@nestjs/common';
import { ExpenseType } from '../entities/expense-type.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from 'src/common/repositories/base-repository';

@Injectable()
export class ExpenseTypeRepository extends BaseRepository<ExpenseType> {
  constructor(
    @InjectRepository(ExpenseType)
    private readonly repository: BaseRepository<ExpenseType>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }
}
