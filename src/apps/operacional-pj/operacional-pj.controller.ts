import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OperacionalPjService } from './operacional-pj.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateOperacionalPjDto } from './dto/create-operacional-pj.dto';
import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('operacional-pj')
@ApiBearerAuth()
@ApiTags('Operacional PJ')
export class OperacionalPjController {
  constructor(private readonly operacionalPjService: OperacionalPjService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createOperacionalPj: CreateOperacionalPjDto) {
    return this.operacionalPjService.create(createOperacionalPj);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperacionalPjDto) {
    return this.operacionalPjService.update(id, dto);
  }
}
