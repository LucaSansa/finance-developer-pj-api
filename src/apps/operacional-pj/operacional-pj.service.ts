import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OperacionalPj } from './entities/operacional-pj.entity';
import { Repository, DataSource } from 'typeorm';
import { MonthlyClosingService } from '../monthly-closing/monthly-closing.service';
import { CreateOperacionalPjDto } from './dto/create-operacional-pj.dto';
import { Invoice } from '../invoice/entities/invoice.entity';
import { MonthlyClosing } from '../monthly-closing/entities/monthly-closing.entity';

// import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';

@Injectable()
export class OperacionalPjService {
  constructor(
    @InjectRepository(OperacionalPj)
    private operacionalPjRepo: Repository<OperacionalPj>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @Inject(forwardRef(() => MonthlyClosingService))
    private monthlyClosingService: MonthlyClosingService,
    private readonly dataSource: DataSource,
  ) {}

  async create(id: string, createMonthlyClosingDto: CreateOperacionalPjDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const monthlyClosing = await queryRunner.manager.findOne(MonthlyClosing, {
        where: {
          id,
        },
        relations: {
          operacionalPj: true,
          user: true,
        },
      });

      if (!monthlyClosing)
        throw new UnauthorizedException('Mês de fechamento não encontrado.');

      if (monthlyClosing.operacionalPj !== null) {
        throw new ConflictException(
          'Mês de fechamento já possui operacional PJ',
        );
      }

      const totalInvoice =
        createMonthlyClosingDto.invoice?.reduce(
          (acc, item) => acc + item.value,
          0,
        ) ?? 0;

      const operacionalPj = queryRunner.manager.create(OperacionalPj, {
        accountFee: createMonthlyClosingDto.accountFee ?? 0,
        individualContribution:
          createMonthlyClosingDto.individualContribution ?? 0,
        totalInvoiceTax: totalInvoice * 0.06,
        // monthlyClosing: monthlyClosing,
        monthlyClosingId: id,
      });

      await queryRunner.manager.save(OperacionalPj, operacionalPj);

      if (createMonthlyClosingDto.invoice?.length) {
        const invoices = createMonthlyClosingDto.invoice.map((invoice) =>
          queryRunner.manager.create(Invoice, {
            value: invoice.value,
            operacionalPjId: operacionalPj.id,
          }),
        );

        await queryRunner.manager.save(Invoice, invoices);
      }

      await queryRunner.manager.update(MonthlyClosing, id, {
        amountCollected: totalInvoice,
      });

      await queryRunner.commitTransaction();

      return await this.operacionalPjRepo.findOne({
        where: {
          id,
        },
        relations: {
          invoice: true,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string) {
    return await this.operacionalPjRepo.findOne({ where: { id } });
  }

  async deleteById(id: string) {
    return await this.operacionalPjRepo.softDelete({ id });
  }

  // async update(id: string, dto: UpdateOperacionalPjDto) {
  //   const operacionalPj = await this.findById(id);

  //   if (!operacionalPj)
  //     throw new UnauthorizedException('Operacional PJ não encontrado.');

  //   return await this.operacionalPjRepo.save({
  //     ...operacionalPj,
  //     accountFee: dto.accountFee,
  //     individualContribution: dto.individualContribution,
  //     totalInvoiceTax: dto.totalInvoiceTax,
  //   });
  // }
}
