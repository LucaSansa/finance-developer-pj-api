import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateMonthlyClosingDto } from './dto/create-monthly-closing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { MonthlyClosing } from './entities/monthly-closing.entity';
import { UserService } from '../user/user.service';
import { MonthlyClosingRepository } from './repositories/monthly-closing.repository';
import { FilterMonthlyClosingDateDto } from './dto/filter-monthly-closing-date.dto';
import { UpdateMonthlyClosingDto } from './dto/update-monthly-closing.dto';
import { OperacionalPj } from '../operacional-pj/entities/operacional-pj.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { PersonalExpense } from '../personal-expenses/entities/personal-expense.entity';

@Injectable()
export class MonthlyClosingService {
  constructor(
    @InjectRepository(MonthlyClosing)
    private monthlyClosingRepo: Repository<MonthlyClosing>,
    private userService: UserService,
    private readonly dataSource: DataSource,
    private readonly MonthlyClosingRepository: MonthlyClosingRepository,
  ) {}

  async create(userId: string, dto: CreateMonthlyClosingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado.');
      }

      const monthlyExists = await queryRunner.manager.findOne(MonthlyClosing, {
        where: {
          userId,
          closingDate: dto.closingDate,
        },
      });

      if (monthlyExists) {
        throw new ConflictException(
          'Fechamento mensal para essa data já existe.',
        );
      }

      const totalInvoices =
        dto.operacionalPj?.invoice?.reduce(
          (acc, invoice) => acc + invoice.value,
          0,
        ) ?? 0;

      const monthly = queryRunner.manager.create(MonthlyClosing, {
        closingDate: dto.closingDate,
        amountCollected: totalInvoices,
        isClosing: dto.isClosing ?? false,
        userId,
      });

      await queryRunner.manager.save(MonthlyClosing, monthly);

      const operacionalPj = dto.operacionalPj;

      const shouldCreateOperacionalPj =
        operacionalPj &&
        (operacionalPj.accountFee !== undefined ||
          operacionalPj.individualContribution !== undefined ||
          !!operacionalPj.invoice?.length);

      if (shouldCreateOperacionalPj) {
        const operacionalPjEntity = queryRunner.manager.create(OperacionalPj, {
          accountFee: operacionalPj.accountFee ?? 0,
          individualContribution: operacionalPj.individualContribution ?? 0,
          totalInvoiceTax: totalInvoices * (user.taxPercentage / 100),
          monthlyClosingId: monthly.id,
        });

        await queryRunner.manager.save(OperacionalPj, operacionalPjEntity);

        if (operacionalPj.invoice?.length) {
          const invoices = operacionalPj.invoice.map((invoice) =>
            queryRunner.manager.create(Invoice, {
              value: invoice.value,
              operacionalPjId: operacionalPjEntity.id,
            }),
          );

          await queryRunner.manager.save(Invoice, invoices);
        }
      }

      if (dto.personalExpense?.length) {
        const expenses = dto.personalExpense.map((expense) =>
          queryRunner.manager.create(PersonalExpense, {
            name: expense.name,
            description: expense.description,
            value: expense.value,
            expenseTypeId: expense.expenseTypeId,
            monthlyClosingId: monthly.id,
          }),
        );

        await queryRunner.manager.save(PersonalExpense, expenses);
      }

      await queryRunner.commitTransaction();

      return await this.MonthlyClosingRepository.findOne({
        where: {
          id: monthly.id,
        },
        relations: {
          operacionalPj: {
            invoice: true,
          },
          personalExpense: true,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, userId: string, dto: UpdateMonthlyClosingDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado.');
      }

      const monthly = await queryRunner.manager.findOne(MonthlyClosing, {
        where: {
          id,
          userId,
        },
        relations: {
          operacionalPj: true,
        },
      });

      if (!monthly) {
        throw new NotFoundException('Fechamento mensal não encontrado.');
      }

      /*
       * =========================================================
       * 1. CAMPOS SIMPLES DO MONTHLY CLOSING
       * =========================================================
       */

      if (dto.closingDate !== undefined) {
        const monthlyExists = await queryRunner.manager.findOne(
          MonthlyClosing,
          {
            where: {
              userId,
              closingDate: dto.closingDate,
              id: Not(id),
            },
          },
        );

        if (monthlyExists) {
          throw new ConflictException(
            'Fechamento mensal para essa data já existe.',
          );
        }

        monthly.closingDate = dto.closingDate;
      }

      if (dto.isClosing !== undefined) {
        monthly.isClosing = dto.isClosing;
      }

      /*
       * =========================================================
       * 2. OPERACIONAL PJ
       * =========================================================
       */

      if (dto.operacionalPj !== undefined) {
        let operacionalPj = monthly.operacionalPj;

        /*
         * Se o PJ ainda não existe, criamos.
         */
        if (!operacionalPj) {
          operacionalPj = queryRunner.manager.create(OperacionalPj, {
            accountFee: dto.operacionalPj.accountFee ?? 0,

            individualContribution:
              dto.operacionalPj.individualContribution ?? 0,

            totalInvoiceTax: 0,

            monthlyClosingId: monthly.id,
          });

          operacionalPj = await queryRunner.manager.save(
            OperacionalPj,
            operacionalPj,
          );

          monthly.operacionalPj = operacionalPj;
        } else {
          /*
           * Atualiza somente os campos enviados.
           */

          if (dto.operacionalPj.accountFee !== undefined) {
            operacionalPj.accountFee = dto.operacionalPj.accountFee;
          }

          if (dto.operacionalPj.individualContribution !== undefined) {
            operacionalPj.individualContribution =
              dto.operacionalPj.individualContribution;
          }

          await queryRunner.manager.save(OperacionalPj, operacionalPj);
        }

        /*
         * =======================================================
         * 3. INVOICES
         * =======================================================
         *
         * Só entra aqui se "invoice" realmente foi enviado.
         *
         * undefined -> não altera invoices
         * []        -> remove todas
         * [...]     -> substitui todas
         */

        if (dto.operacionalPj.invoice !== undefined) {
          await queryRunner.manager.softDelete(Invoice, {
            operacionalPjId: operacionalPj.id,
          });

          const invoices = dto.operacionalPj.invoice.map((invoice) =>
            queryRunner.manager.create(Invoice, {
              value: invoice.value,
              operacionalPjId: operacionalPj.id,
            }),
          );

          if (invoices.length > 0) {
            await queryRunner.manager.save(Invoice, invoices);
          }

          /*
           * Recalcula somente porque as invoices foram alteradas.
           */

          const totalInvoices = dto.operacionalPj.invoice.reduce(
            (acc, invoice) => acc + invoice.value,
            0,
          );

          monthly.amountCollected = totalInvoices;

          operacionalPj.totalInvoiceTax =
            totalInvoices * (user.taxPercentage / 100);

          await queryRunner.manager.save(OperacionalPj, operacionalPj);
        }
      }

      /*
       * =========================================================
       * 4. DESPESAS PESSOAIS
       * =========================================================
       *
       * undefined -> não altera
       * []        -> remove todas
       * [...]     -> substitui todas
       */

      if (dto.personalExpense !== undefined) {
        await queryRunner.manager.softDelete(PersonalExpense, {
          monthlyClosingId: monthly.id,
        });

        const expenses = dto.personalExpense.map((expense) =>
          queryRunner.manager.create(PersonalExpense, {
            name: expense.name,
            description: expense.description,
            value: expense.value,
            expenseTypeId: expense.expenseTypeId,
            monthlyClosingId: monthly.id,
          }),
        );

        if (expenses.length > 0) {
          await queryRunner.manager.save(PersonalExpense, expenses);
        }
      }

      /*
       * =========================================================
       * 5. SALVA O MONTHLY CLOSING
       * =========================================================
       */

      await queryRunner.manager.save(MonthlyClosing, monthly);

      await queryRunner.commitTransaction();

      /*
       * Busca novamente para retornar o estado atualizado.
       */

      return await this.MonthlyClosingRepository.findOne({
        where: {
          id: monthly.id,
        },
        relations: {
          operacionalPj: {
            invoice: true,
          },
          personalExpense: true,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: string, dto: FilterMonthlyClosingDateDto) {
    return await this.MonthlyClosingRepository.findAllByUser(userId, dto);
  }

  async findOneById(userId: string, id: string) {
    try {
      const user = await this.userService.findById(userId);

      if (!user) throw new UnauthorizedException('Usuário não encontrado.');

      const monthly = await this.monthlyClosingRepo.findOne({
        where: { id, userId },
      });

      if (!monthly)
        throw new NotFoundException('Fechamento mensal não encontrado.');

      return await this.MonthlyClosingRepository.findOneById(id);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findById(id: string) {
    return await this.monthlyClosingRepo.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async delete(id: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const monthly = await this.monthlyClosingRepo.findOne({
        where: {
          id,
          userId,
        },
        relations: {
          user: true,
        },
      });

      if (!monthly) {
        throw new ConflictException('Fechamento mensal não encontrado.');
      }

      if (monthly.user.id !== userId) {
        throw new UnauthorizedException(
          'Você não tem permissão para deletar este fechamento mensal.',
        );
      }

      await queryRunner.manager.softDelete('PersonalExpense', {
        monthlyClosingId: monthly.id,
      });

      if (monthly.operacionalPj?.id) {
        await queryRunner.manager.softDelete('Invoice', {
          operacionalPjId: monthly.operacionalPj?.id,
        });
      }

      await queryRunner.manager.softDelete('OperacionalPj', {
        monthlyClosingId: monthly.id,
      });

      await queryRunner.manager.softDelete(MonthlyClosing, { id });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
