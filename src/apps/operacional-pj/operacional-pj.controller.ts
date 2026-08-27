import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OperacionalPjService } from './operacional-pj.service';
import { CreateOperacionalPjDto } from './dto/create-operacional-pj.dto';
import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('operacional-pj')
@ApiBearerAuth()
@ApiTags('Operacional PJ')
export class OperacionalPjController {
  constructor(private readonly operacionalPjService: OperacionalPjService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  create(
    @Param('id') id: string,
    @Body() createOperacionalPj: CreateOperacionalPjDto,
  ) {
    return this.operacionalPjService.create(id, createOperacionalPj);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperacionalPjDto) {
    // return this.operacionalPjService.update(id, dto);
  }
}
