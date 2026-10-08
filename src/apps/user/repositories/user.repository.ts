import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repositories/base-repository';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly repository: BaseRepository<User>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async saveRefreshTokenHash(
    userId: string,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.update(userId, { refreshTokenHash });
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await this.update(userId, { refreshTokenHash: null });
  }

  async findByIdWithRefreshHash(userId: string) {
    const query = this.createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: userId });

    return query.getOne();
  }

  async findByEmailVerificationTokenHash(tokenHash: string) {
    const query = this.createQueryBuilder('user')
      .addSelect([
        'user.id',
        'user.emailVerificationTokenHash',
        'user.emailVerificationExpiresAt',
      ])
      .where('user.emailVerificationTokenHash = :tokenHash', { tokenHash });

    return query.getOne();
  }

  async findByEmailForResendVerification(email: string) {
    const query = this.createQueryBuilder('user')
      .addSelect(['user.id', 'user.emailVerifiedAt'])
      .where('user.email = :email', { email });

    return query.getOne();
  }

  async findByPasswordResetTokenHash(tokenHash: string) {
    const query = this.createQueryBuilder('user')
      .addSelect(['user.passwordResetTokenHash', 'user.passwordResetExpiresAt'])
      .where('user.password_reset_token_hash = :tokenHash', { tokenHash });

    return query.getOne();
  }

  async findByEmailChangeTokenHash(tokenHash: string) {
    const query = this.createQueryBuilder('user')
      .addSelect(['user.emailChangeTokenHash', 'user.emailChangeExpiresAt'])
      .where('user.emailChangeTokenHash = :tokenHash', { tokenHash });

    return query.getOne();
  }
}
