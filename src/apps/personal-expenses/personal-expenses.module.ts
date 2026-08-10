import { forwardRef, Module } from '@nestjs/common';
import { PersonalExpensesService } from './personal-expenses.service';
import { PersonalExpensesController } from './personal-expenses.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalExpense } from './entities/personal-expense.entity';
import { MonthlyClosing } from '../monthly-closing/entities/monthly-closing.entity';
import { ExpenseType } from './entities/expense-type.entity';
import { MonthlyClosingModule } from '../monthly-closing/monthly-closing.module';
import { ExpenseTypeRepository } from './repositories/expense-type.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalExpense, MonthlyClosing, ExpenseType]),
    forwardRef(() => MonthlyClosingModule),
  ],
  controllers: [PersonalExpensesController],
  providers: [PersonalExpensesService, ExpenseTypeRepository],
})
export class PersonalExpensesModule {}
