import { forwardRef, Module } from '@nestjs/common';
import { MonthlyClosingService } from './monthly-closing.service';
import { MonthlyClosingController } from './monthly-closing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyClosing } from './entities/monthly-closing.entity';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';
import { OperacionalPjModule } from '../operacional-pj/operacional-pj.module';
import { PersonalExpense } from '../personal-expenses/entities/personal-expense.entity';
import { MonthlyClosingRepository } from './repositories/monthly-closing.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlyClosing, User, PersonalExpense]),
    UserModule,
    forwardRef(() => OperacionalPjModule),
  ],
  controllers: [MonthlyClosingController],
  providers: [MonthlyClosingService, MonthlyClosingRepository],
  exports: [MonthlyClosingService],
})
export class MonthlyClosingModule {}
