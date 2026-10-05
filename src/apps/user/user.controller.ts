import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um novo usuário' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  findByMe(@CurrentUser() user: { id: string; email: string }) {
    return this.userService.findById(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/email-change')
  @ApiOperation({ summary: 'Solicita a troca do e-mail da conta' })
  requestEmailChange(
    @CurrentUser() user: { id: string },
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.userService.requestEmailChange(user.id, dto.email);
  }
}
