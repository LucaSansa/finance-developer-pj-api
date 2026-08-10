import { OperacionalPj } from 'src/apps/operacional-pj/entities/operacional-pj.entity';
import { PersonalExpense } from 'src/apps/personal-expenses/entities/personal-expense.entity';
import { User } from 'src/apps/user/entities/user.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { decimalTransformer } from 'src/common/helpers/decimal-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

@Entity()
export class MonthlyClosing extends BaseEntity<MonthlyClosing> {
  @Column()
  closingDate: string;

  @Column({
    transformer: decimalTransformer,
  })
  amountCollected: number;

  @Column({ default: false })
  isClosing: boolean;

  @Column()
  userId: string;

  @ManyToOne(() => User, (item) => item.monthlyClosing, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => OperacionalPj, (item) => item.monthlyClosing)
  operacionalPj?: OperacionalPj;

  @OneToMany(() => PersonalExpense, (item) => item.monthlyClosing, {
    cascade: true,
  })
  personalExpense?: PersonalExpense[];
}
