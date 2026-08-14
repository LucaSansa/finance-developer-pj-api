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
