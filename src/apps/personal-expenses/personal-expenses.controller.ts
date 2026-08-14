import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PersonalExpensesService } from './personal-expenses.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePersonalExpenseDto } from './dto/create-personal-expense.dto';
import { UpdatePersonalExpenseDto } from './dto/update-personal-expense.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('personal-expenses')
@ApiBearerAuth()
@ApiTags('Personal Expenses')
export class PersonalExpensesController {
  constructor(
    private readonly personalExpensesService: PersonalExpensesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPersonalExpenses: CreatePersonalExpenseDto) {
    return this.personalExpensesService.create(createPersonalExpenses);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonalExpenseDto) {
    return this.personalExpensesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expense-types')
  findAllExpenseTypes() {
    return this.personalExpensesService.findAllExpenseTypes();
  }
}
