import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PersonalExpensesService } from './personal-expenses.service';
import { CreatePersonalExpenseDto } from './dto/create-personal-expense.dto';
import { UpdatePersonalExpenseDto } from './dto/update-personal-expense.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('personal-expenses')
@ApiBearerAuth()
@ApiTags('Personal Expenses')
export class PersonalExpensesController {
  constructor(
    private readonly personalExpensesService: PersonalExpensesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @ApiOperation({ summary: 'Cria despesa pessoal para mês de fechamento' })
  @ApiParam({
    name: 'id',
    description: 'ID do fechamento mensal',
  })
  create(
    @Param('id') monthlyId: string,
    @CurrentUser() user: { id: string },
    @Body() createPersonalExpenses: CreatePersonalExpenseDto,
  ) {
    return this.personalExpensesService.create(
      monthlyId,
      user.id,
      createPersonalExpenses,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza despesa pessoa por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID da despesa pessoal',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePersonalExpenseDto,
  ) {
    return this.personalExpensesService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta despesa pessoal' })
  @ApiParam({
    name: 'id',
    description: 'ID da despesa pessoal',
  })
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.personalExpensesService.delete(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expense-types')
  @ApiOperation({
    summary: 'Lista todos os tipos de despesas pessoais cadastradas no banco',
  })
  findAllExpenseTypes() {
    return this.personalExpensesService.findAllExpenseTypes();
  }
}
