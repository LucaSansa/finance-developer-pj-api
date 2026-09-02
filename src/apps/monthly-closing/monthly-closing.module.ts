import { Module } from '@nestjs/common';
import { MonthlyClosingService } from './monthly-closing.service';
import { MonthlyClosingController } from './monthly-closing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyClosing } from './entities/monthly-closing.entity';
import { UserModule } from '../user/user.module';
import { MonthlyClosingRepository } from './repositories/monthly-closing.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlyClosing]), UserModule],
  controllers: [MonthlyClosingController],
  providers: [MonthlyClosingService, MonthlyClosingRepository],
  exports: [MonthlyClosingService],
})
export class MonthlyClosingModule {}
