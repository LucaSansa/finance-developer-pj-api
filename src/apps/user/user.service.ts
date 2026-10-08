import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const existingCnpj = await this.userRepo.findOne({
      where: {
        cnpj: dto.cnpj,
      },
    });

    if (existingCnpj) {
      throw new ConflictException('Cnpj já cadastrado');
    }

    const token = this.generateEmailVerificationToken();

    const user = this.userRepo.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
      emailVerifiedAt: null,
      emailVerificationTokenHash: this.hashToken(token),
      emailVerificationExpiresAt: this.getVerificationExpiration(24),
      emailVerificationSentAt: new Date(),
    });

    await this.userRepo.save(user);

    try {
      await this.sendVerificationRegisterEmail(user, token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Falha ao enviar e-mail de confirmação para ${user.email}: ${errorMessage}`,
        errorStack,
      );

      throw new InternalServerErrorException('Erro ao enviar o email.');
    }

    return {
      message:
        'Cadastro realizado. Consulte seu e-mail para confirmar a conta.',
    };
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    if (dto.cnpj && dto.cnpj !== user.cnpj) {
      const existingCnpj = await this.userRepo.findOne({
        where: {
          cnpj: dto.cnpj,
        },
      });

      if (existingCnpj) {
        throw new ConflictException('Cnpj já cadastrado');
      }
    }

    this.userRepo.merge(user, dto);
    return this.userRepo.save(user);
  }

  async sendVerificationRegisterEmail(
    user: User,
    token: string,
  ): Promise<void> {
    const frontUrl = process.env.FRONTEND_URL;
    const verificationUrl = `${frontUrl}/confirmar-email?token=${encodeURIComponent(token)}`;

    await this.emailService.sendEmailVerification(
      user.email,
      user.name,
      verificationUrl,
    );
  }

  async confirmEmail(userId: string) {
    await this.userRepo.update(userId, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
    });
  }

  async saveNewVerificationToken(userId: string, token: string) {
    await this.userRepo.update(userId, {
      emailVerificationTokenHash: this.hashToken(token),
      emailVerificationExpiresAt: this.getVerificationExpiration(24),
      emailVerificationSentAt: new Date(),
    });
  }

  async sendPasswordResetEmail(
    user: { email: string; name: string },
    token: string,
  ): Promise<void> {
    const frontUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordReset(user.email, user.name, resetUrl);
  }

  async saveNewPasswordResetToken(userId: string, token: string) {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    await this.userRepo.update(userId, {
      passwordResetTokenHash: this.hashToken(token),
      passwordResetExpiresAt: expiration,
      passwordResetSentAt: new Date(),
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.userRepo.update(userId, {
      password: passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      passwordResetSentAt: null,
      refreshTokenHash: null, // Força deslogar sessões antigas por segurança
    });
  }

  //refatorar
  async sendEmailChangeConfirmation(
    user: User,
    recipientEmail: string,
    token: string,
  ): Promise<void> {
    const frontUrl = process.env.FRONTEND_URL;
    const confirmationUrl = `${frontUrl}/confirmar-troca-email?token=${encodeURIComponent(token)}`;

    await this.emailService.sendEmailChangeConfirmation(
      recipientEmail,
      user.name,
      confirmationUrl,
    );
  }

  async requestEmailChange(userId: string, email: string) {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user?.email === email) {
      throw new ConflictException('Informe um e-mail diferente do atual.');
    }

    const emailRegistered = await this.findByEmail(email);

    if (emailRegistered) {
      throw new ConflictException('Este email já foi cadastrado');
    }

    const token = this.generateEmailVerificationToken();

    await this.userRepo.update(userId, {
      pendingEmail: email,
      emailChangeTokenHash: this.hashToken(token),
      emailChangeExpiresAt: this.getVerificationExpiration(1),
    });

    try {
      await this.sendEmailChangeConfirmation(user, email, token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Falha ao enviar confirmação de troca de e-mail: ${errorMessage}`,
      );

      throw new InternalServerErrorException(
        'Não foi possível enviar o e-mail de confirmação. Tente novamente.',
        errorStack,
      );
    }

    return {
      message: 'Enviamos um link de confirmação para o novo endereço.',
    };
  }

  async applyPendingEmailChange(
    userId: string,
    tokenHash: string,
    pendingEmail: string,
    now: Date,
  ): Promise<boolean> {
    try {
      const result = await this.userRepo.update(
        {
          id: userId,
          emailChangeTokenHash: tokenHash,
          pendingEmail,
        },
        {
          email: pendingEmail,
          emailVerifiedAt: now,
          pendingEmail: null,
          emailChangeTokenHash: null,
          emailChangeExpiresAt: null,
          refreshTokenHash: null,
        },
      );

      return result.affected === 1;
    } catch (error) {
      if (this.isPostgresUniqueViolation(error)) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: {
        email,
      },
      select: [
        'id',
        'name',
        'cnpj',
        'email',
        'taxPercentage',
        'password',
        'emailVerifiedAt',
      ],
    });
  }

  findById(id: string) {
    return this.userRepo.findOne({
      where: {
        id,
      },
    });
  }

  generateEmailVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getVerificationExpiration(expirationInHours: number): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + expirationInHours);
    return expiration;
  }

  private isPostgresUniqueViolation(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('driverError' in error)
    ) {
      return false;
    }

    const driverError = error.driverError;
    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    );
  }
}
