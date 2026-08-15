import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { CurrentUser } from './decorators/user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { type Response } from 'express';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // só HTTPS em prod
  sameSite: 'strict' as const,
  // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms (deve bater com JWT_REFRESH_EXPIRES_IN)
  maxAge: 2 * 60 * 1000,
  path: '/',
};

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Realiza login e retorna o token JWT' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...response } = await this.authService.login(dto);
    res.cookie('refresh_token', refresh_token, COOKIE_OPTIONS);
    return response;
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Gera novo par de tokens — invalida o refresh token anterior',
  })
  async refresh(
    @CurrentUser() user: { id: string; email: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...response } = await this.authService.refresh(
      user.id,
      user.email,
      user.refreshToken,
    );

    res.cookie('refresh_token', refresh_token, COOKIE_OPTIONS);

    return response;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout — invalida o refresh token no servidor' })
  logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refresh_token', { path: '/' });

    return this.authService.logout(user.id);
  }
}
