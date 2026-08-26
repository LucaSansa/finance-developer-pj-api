import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OperacionalPj } from './entities/operacional-pj.entity';
import { Repository } from 'typeorm';
import { MonthlyClosingService } from '../monthly-closing/monthly-closing.service';
import { CreateOperacionalPjDto } from './dto/create-operacional-pj.dto';
import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';

@Injectable()
export class OperacionalPjService {
  constructor(
    @InjectRepository(OperacionalPj)
    private operacionalPjRepo: Repository<OperacionalPj>,
    @Inject(forwardRef(() => MonthlyClosingService))
    private monthlyClosingService: MonthlyClosingService,
  ) {}

  async create(createMonthlyClosingDto: CreateOperacionalPjDto) {
    const monthlyClosing = await this.monthlyClosingService.findById(
      createMonthlyClosingDto.monthlyClosingId,
    );

    if (!monthlyClosing)
      throw new UnauthorizedException('Mês de fechamento não encontrado.');

    const totalInvoice = createMonthlyClosingDto.invoice?.reduce(
      (acc, item) => acc + item.value,
      0,
    );

    const operacionalPj = this.operacionalPjRepo.create({
      ...createMonthlyClosingDto,
      totalInvoiceTax: totalInvoice! * (6 / 100),
      monthlyClosing: monthlyClosing,
    });

    return await this.operacionalPjRepo.save(operacionalPj);
  }

  async findById(id: string) {
    return await this.operacionalPjRepo.findOne({ where: { id } });
  }

  async deleteById(id: string) {
    return await this.operacionalPjRepo.softDelete({ id });
  }

  async update(id: string, dto: UpdateOperacionalPjDto) {
    const operacionalPj = await this.findById(id);

    if (!operacionalPj)
      throw new UnauthorizedException('Operacional PJ não encontrado.');

    return await this.operacionalPjRepo.save({
      ...operacionalPj,
      accountFee: dto.accountFee,
      individualContribution: dto.individualContribution,
      totalInvoiceTax: dto.totalInvoiceTax,
    });
  }
}
