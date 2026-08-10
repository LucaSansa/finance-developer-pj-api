import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repositories/base-repository';
import { OperacionalPj } from '../entities/operacional-pj.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class OperacionalPjRepository extends BaseRepository<OperacionalPj> {
  constructor(
    @InjectRepository(OperacionalPj)
    private readonly repository: BaseRepository<OperacionalPj>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }
}
