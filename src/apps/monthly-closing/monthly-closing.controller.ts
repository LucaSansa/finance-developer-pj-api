import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MonthlyClosingService } from './monthly-closing.service';
import { CreateMonthlyClosingDto } from './dto/create-monthly-closing.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { FilterMonthlyClosingDateDto } from './dto/filter-monthly-closing-date.dto';
import { UpdateMonthlyClosingDto } from './dto/update-monthly-closing.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('monthly-closing')
@ApiBearerAuth()
@ApiTags('Monthly Closing')
export class MonthlyClosingController {
  constructor(private readonly monthlyClosingService: MonthlyClosingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Cria fechamento mensal',
  })
  create(
    @CurrentUser() user: { id: string },
    @Body() createMonthlyClosingDto: CreateMonthlyClosingDto,
  ) {
    return this.monthlyClosingService.create(user.id, createMonthlyClosingDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('find-all')
  @ApiOperation({
    summary: 'Lista todos os fechementos mensais do usuário de forma paginada',
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() dto: FilterMonthlyClosingDateDto,
  ) {
    return this.monthlyClosingService.findAll(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('find-one/:id')
  @ApiOperation({ summary: 'Buca por um mês de fechamento por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do fechamento mensal',
  })
  findById(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.monthlyClosingService.findOneById(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza mês de fechamento por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do fechamento mensal',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMonthlyClosingDto,
  ) {
    return this.monthlyClosingService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Deleta fechamento mensal',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do fechamento mensal',
  })
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.monthlyClosingService.delete(id, user.id);
  }
}
