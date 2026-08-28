import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OperacionalPjService } from './operacional-pj.service';
import { CreateOperacionalPjDto } from './dto/create-operacional-pj.dto';
import { UpdateOperacionalPjDto } from './dto/update-operacional-pj.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('operacional-pj')
@ApiBearerAuth()
@ApiTags('Operacional PJ')
export class OperacionalPjController {
  constructor(private readonly operacionalPjService: OperacionalPjService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @ApiOperation({
    summary: 'Cria operacional PJ para um determinado fechamento mensal',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do fechamento mensal',
  })
  create(
    @Param('id') id: string,
    @Body() createOperacionalPj: CreateOperacionalPjDto,
  ) {
    return this.operacionalPjService.create(id, createOperacionalPj);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza operacional PJ por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do operacional PJ',
  })
  update(@Param('id') id: string, @Body() dto: UpdateOperacionalPjDto) {
    return this.operacionalPjService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Deleta operacional PJ por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID do operacional PJ',
  })
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.operacionalPjService.delete(id, user.id);
  }
}
