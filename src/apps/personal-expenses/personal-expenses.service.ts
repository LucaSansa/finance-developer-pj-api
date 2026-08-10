import {
  forwardRef,
  Inject,
  Injectable,
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

  async create(personalExpenseDto: CreatePersonalExpenseDto) {
    const monthlyClosing = await this.monthlyClosingService.findById(
      personalExpenseDto.monthlyClosingId,
    );

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

  async findById(id: string) {
    return await this.personalExpenseRepo.findOne({ where: { id } });
  }

  async deleteById(id: string) {
    return await this.personalExpenseRepo.softDelete({ id });
  }

  async update(id: string, dto: UpdatePersonalExpenseDto) {
    const personalExpense = await this.findById(id);

    if (!personalExpense)
      throw new UnauthorizedException('Operacional PJ não encontrado.');

    return await this.personalExpenseRepo.save({
      ...personalExpense,
      name: dto.name,
      description: dto.description,
      value: dto.value,
      expenseTypeId: dto.expenseTypeId,
    });
  }

  async findAllExpenseTypes() {
    return await this.expenseTypeRepository.find();
  }
}
