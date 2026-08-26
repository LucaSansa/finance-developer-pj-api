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
import { OperacionalPjRepository } from '../operacional-pj/repositories/operacional-pj.repository';
import { MonthlyClosingRepository } from './repositories/monthly-closing.repository';
import { FilterMonthlyClosingDateDto } from './dto/filter-monthly-closing-date.dto';
import { UpdateMonthlyClosingDto } from './dto/update-monthly-closing.dto';

@Injectable()
export class MonthlyClosingService {
  constructor(
    @InjectRepository(MonthlyClosing)
    private monthlyClosingRepo: Repository<MonthlyClosing>,
    private userService: UserService,
    private operacionalPjRepo: OperacionalPjRepository,
    private readonly dataSource: DataSource,
    private readonly MonthlyClosingRepository: MonthlyClosingRepository,
  ) {}

  async create(
    userid: string,
    createMonthlyClosingDto: CreateMonthlyClosingDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userService.findById(userid);
      if (!user) throw new UnauthorizedException('Usuario não encontrado.');

      const monthlyExists = await this.monthlyClosingRepo.findOne({
        where: { closingDate: createMonthlyClosingDto.closingDate },
      });

      if (monthlyExists)
        throw new ConflictException(
          'Fechamento mensal para essa data já existe.',
        );

      const totalInvoices =
        createMonthlyClosingDto.operacionalPj?.invoice?.reduce(
          (acc, item) => acc + item.value,
          0,
        ) ?? 0;

      const monthly = this.monthlyClosingRepo.create({
        closingDate: createMonthlyClosingDto.closingDate,
        isClosing: createMonthlyClosingDto.isClosing,
        amountCollected: totalInvoices,
        user,
      });

      await queryRunner.manager.save(monthly);

      if (createMonthlyClosingDto.operacionalPj) {
        const opPj = this.operacionalPjRepo.create({
          ...createMonthlyClosingDto.operacionalPj,
          totalInvoiceTax: totalInvoices * (6 / 100),
          monthlyClosingId: monthly.id,
        });

        await queryRunner.manager.save(opPj);
      }

      if (createMonthlyClosingDto.personalExpense?.length) {
        const expenses = createMonthlyClosingDto.personalExpense.map(
          (expense) =>
            queryRunner.manager.create('PersonalExpense', {
              ...expense,
              monthlyClosingId: monthly.id,
            }),
        );

        await queryRunner.manager.save(expenses);
      }

      await queryRunner.commitTransaction();

      return await this.MonthlyClosingRepository.findOneById(monthly.id);
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
      if (!user) throw new UnauthorizedException('Usuário não encontrado.');

      const monthly = await this.MonthlyClosingRepository.findOneById(id);

      if (!monthly)
        throw new ConflictException('Fechamento mensal não encontrado.');

      const monthlyExists = await this.monthlyClosingRepo.findOne({
        where: {
          closingDate: dto.closingDate ?? monthly.closingDate,
          id: Not(id),
        },
      });

      if (monthlyExists)
        throw new ConflictException(
          'Fechamento mensal para essa data já existe.',
        );

      const totalInvoices =
        dto.operacionalPj?.invoice?.reduce(
          (acc, item) => acc + item.value,
          0,
        ) ?? 0;

      queryRunner.manager.merge(MonthlyClosing, monthly, {
        closingDate: dto.closingDate ?? monthly.closingDate,
        amountCollected: totalInvoices,
        isClosing: dto.isClosing ?? monthly.isClosing,
      });

      await queryRunner.manager.save(monthly);

      if (dto.operacionalPj) {
        if (monthly.operacionalPj) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { invoice, ...operacionalPjData } = dto.operacionalPj;

          queryRunner.manager.merge('OperacionalPj', monthly.operacionalPj, {
            ...operacionalPjData,
            totalInvoiceTax: totalInvoices * (6 / 100),
          });

          await queryRunner.manager.save(monthly.operacionalPj);
        } else {
          const opPj = this.operacionalPjRepo.create({
            ...dto.operacionalPj,
            totalInvoiceTax: totalInvoices * (6 / 100),
            monthlyClosingId: monthly.id,
          });

          await queryRunner.manager.save(opPj);
        }
      }

      if (dto.operacionalPj?.invoice?.length) {
        await queryRunner.manager.softDelete('Invoice', {
          operacionalPjId: monthly.operacionalPj?.id,
        });

        const invoices = dto.operacionalPj.invoice.map((invoice) =>
          queryRunner.manager.create('Invoice', {
            ...invoice,
            operacionalPj: monthly.operacionalPj,
            operacionalPjId: monthly.operacionalPj?.id,
          }),
        );
        await queryRunner.manager.save(invoices);
      } else if (monthly?.operacionalPj?.invoice?.length) {
        await queryRunner.manager.softDelete('Invoice', {
          operacionalPjId: monthly.operacionalPj?.id,
        });
      }

      if (dto.personalExpense?.length) {
        await queryRunner.manager.softDelete('PersonalExpense', {
          monthlyClosingId: monthly.id,
        });

        const expenses = dto.personalExpense.map((expense) =>
          queryRunner.manager.create('PersonalExpense', {
            ...expense,
            monthlyClosingId: monthly.id,
          }),
        );

        await queryRunner.manager.save(expenses);
      } else if (monthly.personalExpense?.length) {
        await queryRunner.manager.softDelete('PersonalExpense', {
          monthlyClosingId: monthly.id,
        });
      }

      await queryRunner.commitTransaction();

      return await this.MonthlyClosingRepository.findOneById(monthly.id);
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
        relations: ['operacionalPj', 'personalExpense'],
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
    return await this.monthlyClosingRepo.findOne({ where: { id } });
  }

  async delete(id: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const monthly = await this.MonthlyClosingRepository.findOneById(id);

      console.log('===> ', monthly?.user);

      console.log(monthly);

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
