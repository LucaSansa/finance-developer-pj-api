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
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { FilterMonthlyClosingDateDto } from './dto/filter-monthly-closing-date.dto';
import { UpdateMonthlyClosingDto } from './dto/update-monthly-closing.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('monthly-closing')
@ApiBearerAuth()
@ApiTags('Monthly Closing')
export class MonthlyClosingController {
  constructor(private readonly monthlyClosingService: MonthlyClosingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() createMonthlyClosingDto: CreateMonthlyClosingDto,
  ) {
    return this.monthlyClosingService.create(user.id, createMonthlyClosingDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('find-all')
  findAll(
    @CurrentUser() user: { id: string },
    @Query() dto: FilterMonthlyClosingDateDto,
  ) {
    return this.monthlyClosingService.findAll(user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('find-one')
  findById(@CurrentUser() user: { id: string }, @Query('id') id: string) {
    return this.monthlyClosingService.findOneById(user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMonthlyClosingDto,
  ) {
    return this.monthlyClosingService.update(id, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.monthlyClosingService.delete(id, user.id);
  }
}
