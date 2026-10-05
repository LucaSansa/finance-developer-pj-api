import { MonthlyClosing } from 'src/apps/monthly-closing/entities/monthly-closing.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column, OneToMany } from 'typeorm';

@Entity()
export class User extends BaseEntity<User> {
  @Column()
  name: string;

  @Column({ unique: true })
  cnpj: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({
    type: 'varchar',
    nullable: true,
    select: false,
    name: 'email_verification_token_hash',
  })
  emailVerificationTokenHash: string | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    select: false,
    name: 'email_verification_expires_at',
  })
  emailVerificationExpiresAt: Date | null;

  @Column({
    type: 'timestamp with time zone',
    select: false,
    nullable: true,
    name: 'email_verification_sent_at',
  })
  emailVerificationSentAt: Date | null;

  @Column({
    type: 'varchar',
    select: false,
    nullable: true,
    name: 'password_reset_token_hash',
  })
  passwordResetTokenHash: string | null;

  @Column({
    type: 'timestamp with time zone',
    select: false,
    nullable: true,
    name: 'password_reset_expires_at',
  })
  passwordResetExpiresAt: Date | null;

  @Column({
    type: 'timestamp with time zone',
    select: false,
    nullable: true,
    name: 'password_reset_sent_at',
  })
  passwordResetSentAt: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'pending_email' })
  pendingEmail: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    select: false,
    name: 'email_change_token_hash',
  })
  emailChangeTokenHash: string | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    select: false,
    name: 'email_change_expires_at',
  })
  emailChangeExpiresAt: Date | null;

  @Column({
    type: 'varchar',
    select: false,
    nullable: true,
    name: 'refresh_token_hash',
  })
  refreshTokenHash: string | null;

  @OneToMany(() => MonthlyClosing, (item) => item.user, {
    cascade: true,
  })
  monthlyClosing?: MonthlyClosing[];
}
