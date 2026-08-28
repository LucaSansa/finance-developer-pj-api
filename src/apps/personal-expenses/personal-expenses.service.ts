import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PersonalExpense } from './entities/personal-expense.entity';
import { Repository } from 'typeorm';
import { MonthlyClosingService } from '../monthly-closing/monthly-closing.service';
import { CreatePersonalExpenseDto } from './dto/create-personal-expense.dto';
import { UpdatePersonalExpenseDto } from './dto/update-personal-expense.dto';
import { ExpenseTypeRepository } from './repositories/expense-type.repository';

@Injectable()
export class PersonalExpensesService {
  constructor(
    @InjectRepository(PersonalExpense)
    private personalExpenseRepo: Repository<PersonalExpense>,
    @Inject(forwardRef(() => MonthlyClosingService))
    private monthlyClosingService: MonthlyClosingService,
    private readonly expenseTypeRepository: ExpenseTypeRepository,
  ) {}

  async create(
    monthlyId: string,
    personalExpenseDto: CreatePersonalExpenseDto,
  ) {
    const monthlyClosing = await this.monthlyClosingService.findById(monthlyId);

    if (!monthlyClosing)
      throw new UnauthorizedException('Mês de fechamento não encontrado.');

    const personalExpense = this.personalExpenseRepo.create({
      name: personalExpenseDto.name,
      description: personalExpenseDto.description,
      value: personalExpenseDto.value,
      expenseTypeId: personalExpenseDto.expenseTypeId,
      monthlyClosing: monthlyClosing,
    });

    return await this.personalExpenseRepo.save(personalExpense);
  }

  async update(id: string, dto: UpdatePersonalExpenseDto) {
    const personalExpense = await this.findById(id);

    if (!personalExpense) {
      throw new NotFoundException('Despesa pessoal não encontrada.');
    }

    if (dto.expenseTypeId !== undefined) {
      const expenseType = await this.expenseTypeRepository.findOne({
        where: { id: dto.expenseTypeId },
      });

      if (!expenseType) {
        throw new NotFoundException('Tipo de despesa não encontrado.');
      }

      personalExpense.expenseTypeId = dto.expenseTypeId;
      personalExpense.expenseType = expenseType;
    }

    if (dto.name !== undefined) {
      personalExpense.name = dto.name;
    }

    if (dto.description !== undefined) {
      personalExpense.description = dto.description;
    }

    if (dto.value !== undefined) {
      personalExpense.value = dto.value;
    }

    return await this.personalExpenseRepo.save(personalExpense);
  }

  async findById(id: string) {
    return await this.personalExpenseRepo.findOne({ where: { id } });
  }

  async delete(id: string) {
    return await this.personalExpenseRepo.softDelete({ id });
  }

  async findAllExpenseTypes() {
    return await this.expenseTypeRepository.find();
  }
}
