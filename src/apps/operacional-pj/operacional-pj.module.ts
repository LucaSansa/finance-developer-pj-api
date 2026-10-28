import { Module } from '@nestjs/common';
import { OperacionalPjService } from './operacional-pj.service';
import { OperacionalPjController } from './operacional-pj.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperacionalPj } from './entities/operacional-pj.entity';
import { OperacionalPjRepository } from './repositories/operacional-pj.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OperacionalPj])],
  controllers: [OperacionalPjController],
  providers: [OperacionalPjService, OperacionalPjRepository],
  exports: [OperacionalPjService, OperacionalPjRepository],
})
export class OperacionalPjModule {}
