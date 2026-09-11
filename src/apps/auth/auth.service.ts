import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './types/jwt-payload.type';
import { verifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const tokens = await this.generateTokens(user.id, user.email);

    await this.userService.saveRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      user: {
        name: user.name,
        cnpj: user.cnpj,
        email: user.email,
      },
      ...tokens,
    };
  }

  async refresh(userId: string, email: string, incomingRefreshToken: string) {
    const user = await this.userService.findByIdWithRefreshHash(userId);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const incomingHash = createHash('sha256')
      .update(incomingRefreshToken)
      .digest('hex');

    if (incomingHash !== user.refreshTokenHash) {
      await this.userService.clearRefreshTokenHash(userId);
      throw new UnauthorizedException('Refresh token invalido ou ja utilizado');
    }

    const tokens = await this.generateTokens(userId, email);

    await this.userService.saveRefreshTokenHash(userId, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: string) {
    await this.userService.clearRefreshTokenHash(userId);
    return { message: 'Logout realizado com sucesso' };
  }

  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return { access_token, refresh_token };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Usuario não encontrado.');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Credenciais inválidas.');

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Confirme seu e-mail antes de entrar.');
    }

    return user;
  }

  async verifyEmail(dto: verifyEmailDto) {
    const tokenHash = this.userService.hashToken(dto.token);
    const user = await this.userService.findByVerificationTokenHash(tokenHash);

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Link de confirmação inválido ou expirado');
    }

    await this.userService.confirmEmail(user.id);

    return {
      message: 'E-mail confirmado com sucesso. Você já pode fazer login.',
    };
  }

  async resendVerificationEmail(dto: ResendVerificationEmailDto) {
    const user = await this.userService.findByEmailForVerification(dto.email);

    if (!user || user.emailVerifiedAt) {
      return this.resendSuccessMessage();
    }

    const token = this.userService.generateEmailVerificationToken();
    await this.userService.saveNewVerificationToken(user.id, token);
    await this.userService.sendVerificationEmail(user, token);

    return this.resendSuccessMessage();
  }

  private resendSuccessMessage() {
    return {
      message:
        'Se existir uma conta pendente para este e-mail, enviamos uma nova confirmação.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);

    // Medida Anti-Enumeração: Não vaza a existência do e-mail ao cliente.
    if (!user) {
      return this.forgotPasswordSuccessMessage();
    }

    // Gera um token hexadecimal aleatório e seguro
    const token = this.userService.generateEmailVerificationToken();

    await this.userService.saveNewPasswordResetToken(user.id, token);
    await this.userService.sendPasswordResetEmail(user, token);

    return this.forgotPasswordSuccessMessage();
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.userService.hashToken(dto.token);
    const user = await this.userService.findByPasswordResetTokenHash(tokenHash);

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Token de redefinição de senha inválido ou expirado',
      );
    }

    // Hash da nova senha com 10 rounds de salt
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Atualiza campo e invalida dados anteriores temporários
    await this.userService.updatePassword(user.id, passwordHash);

    return {
      message:
        'Sua senha foi redefinida com sucesso. Você já pode fazer login com as novas credenciais.',
    };
  }

  private forgotPasswordSuccessMessage() {
    return {
      message:
        'Se o e-mail informado estiver cadastrado, enviamos um link para redefinição de senha.',
    };
  }
}
