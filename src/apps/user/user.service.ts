import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(data: CreateUserDto) {
    const existingUser = await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const existingCnpj = await this.findByCnpj(data.cnpj);

    if (existingCnpj) {
      throw new ConflictException('Cnpj já cadastrado');
    }

    const token = this.generateEmailVerificationToken();

    const user = this.userRepo.create({
      ...data,
      password: await bcrypt.hash(data.password, 10),
      emailVerifiedAt: null,
      emailVerificationTokenHash: this.hashToken(token),
      emailVerificationExpiresAt: this.getVerificationExpiration(),
      emailVerificationSentAt: new Date(),
    });

    await this.userRepo.save(user);

    //transaction
    try {
      await this.sendVerificationEmail(user, token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Falha ao enviar e-mail de confirmação para ${user.email}: ${errorMessage}`,
        errorStack,
      );
      await this.userRepo.remove(user);
      throw new InternalServerErrorException(
        'Erro ao enviar e-mail de confirmação. Cadastro desfeito. Por favor, tente novamente.',
      );
    }

    return {
      message:
        'Cadastro realizado. Consulte seu e-mail para confirmar a conta.',
    };
  }

  findAll() {
    return this.userRepo.find();
  }

  findById(id: string) {
    return this.userRepo.findOne({
      where: {
        id,
      },
    });
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: {
        email,
      },
      select: ['id', 'name', 'cnpj', 'email', 'password', 'emailVerifiedAt'],
    });
  }

  findByCnpj(cnpj: string) {
    return this.userRepo.findOne({
      where: {
        cnpj: cnpj,
      },
      select: ['name', 'cnpj', 'email'],
    });
  }

  async saveRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  async findByIdWithRefreshHash(userId: string) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: userId })
      .getOne();
  }

  async clearRefreshTokenHash(userId: string) {
    await this.userRepo.update(userId, { refreshTokenHash: null });
  }

  async findByVerificationTokenHash(tokenHash: string) {
    return this.userRepo.findOne({
      where: { emailVerificationTokenHash: tokenHash },
      select: [
        'id',
        'emailVerificationTokenHash',
        'emailVerificationExpiresAt',
      ],
    });
  }

  generateEmailVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getVerificationExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 24);
    return expiration;
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const frontUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
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

  findByEmailForVerification(email: string) {
    return this.userRepo.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'emailVerifiedAt',
        'emailVerificationSentAt',
      ],
    });
  }

  async saveNewVerificationToken(userId: string, token: string) {
    await this.userRepo.update(userId, {
      emailVerificationTokenHash: this.hashToken(token),
      emailVerificationExpiresAt: this.getVerificationExpiration(),
      emailVerificationSentAt: new Date(),
    });
  }
}
