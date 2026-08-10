import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/user.decorator';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';

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

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  findByMe(@CurrentUser() user: { id: string; email: string }) {
    return this.userService.findById(user.id);
  }
}
