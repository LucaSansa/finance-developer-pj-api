import { forwardRef, Module } from '@nestjs/common';
import { OperacionalPjService } from './operacional-pj.service';
import { OperacionalPjController } from './operacional-pj.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperacionalPj } from './entities/operacional-pj.entity';
import { MonthlyClosingModule } from '../monthly-closing/monthly-closing.module';
import { OperacionalPjRepository } from './repositories/operacional-pj.repository';
import { MonthlyClosing } from '../monthly-closing/entities/monthly-closing.entity';
import { Invoice } from '../invoice/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperacionalPj, MonthlyClosing, Invoice]),
    forwardRef(() => MonthlyClosingModule),
  ],
  controllers: [OperacionalPjController],
  providers: [OperacionalPjService, OperacionalPjRepository],
  exports: [OperacionalPjService, OperacionalPjRepository],
})
export class OperacionalPjModule {}
