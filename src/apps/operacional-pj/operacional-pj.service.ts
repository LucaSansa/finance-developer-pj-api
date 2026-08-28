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

import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';

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
    return await this.operacionalPjRepo.findOne({
      where: { id },
      relations: {
        invoice: true,
      },
    });
  }

  async deleteById(id: string) {
    return await this.operacionalPjRepo.softDelete({ id });
  }

  async update(id: string, dto: UpdateOperacionalPjDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const operacionalPj = await queryRunner.manager.findOne(OperacionalPj, {
        where: {
          id,
        },
      });

      if (!operacionalPj)
        throw new UnauthorizedException('Operacional PJ não encontrado.');

      const monthly = await queryRunner.manager.findOne(MonthlyClosing, {
        where: {
          id: operacionalPj.monthlyClosingId,
        },
      });

      if (!monthly)
        throw new UnauthorizedException('Fechamento mensal não encontrado.');

      // Atualiza campos do Operacional PJ
      if (dto.accountFee !== undefined) {
        operacionalPj.accountFee = dto.accountFee;
      }

      if (dto.individualContribution !== undefined) {
        operacionalPj.individualContribution = dto.individualContribution;
      }

      // Atualiza invoices somente se invoice foi enviada
      if (dto.invoice !== undefined) {
        await queryRunner.manager.softDelete(Invoice, {
          operacionalPjId: operacionalPj.id,
        });

        const totalInvoices = dto.invoice.reduce(
          (acc, invoice) => acc + invoice.value,
          0,
        );

        const invoices = dto.invoice.map((invoice) =>
          queryRunner.manager.create(Invoice, {
            value: invoice.value,
            operacionalPjId: operacionalPj.id,
          }),
        );

        if (invoices.length > 0) {
          await queryRunner.manager.save(Invoice, invoices);
        }

        operacionalPj.totalInvoiceTax = totalInvoices * 0.06;

        monthly.amountCollected = totalInvoices;

        await queryRunner.manager.update(MonthlyClosing, monthly.id, {
          amountCollected: totalInvoices,
        });
      }

      // Salva o Operacional PJ uma única vez
      await queryRunner.manager.save(OperacionalPj, operacionalPj);

      await queryRunner.commitTransaction();

      return await this.operacionalPjRepo.findOne({
        where: {
          id: operacionalPj.id,
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

  async delete(id: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const operacionalPj = await this.findById(id);

      if (!operacionalPj) {
        throw new UnauthorizedException('Operacional PJ não encontrado.');
      }

      const monthlyClosing = await queryRunner.manager.findOne(MonthlyClosing, {
        where: {
          id: operacionalPj.monthlyClosingId,
        },
        relations: {
          // operacionalPj: true,
          user: true,
        },
      });

      if (monthlyClosing?.user.id !== userId) {
        throw new UnauthorizedException('Mês de fechamento não encontrado');
      }

      if (operacionalPj.invoice?.length) {
        await queryRunner.manager.softDelete(Invoice, {
          operacionalPjId: operacionalPj.id,
        });
      }

      await queryRunner.manager.softDelete(OperacionalPj, {
        id: id,
      });

      await queryRunner.manager.update(MonthlyClosing, monthlyClosing.id, {
        amountCollected: 0,
      });

      await queryRunner.commitTransaction();

      return await this.operacionalPjRepo.findOne({
        where: {
          id: id,
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
}
