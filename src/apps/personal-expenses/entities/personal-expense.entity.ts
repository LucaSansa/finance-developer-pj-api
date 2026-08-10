import { MonthlyClosing } from 'src/apps/monthly-closing/entities/monthly-closing.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { decimalTransformer } from 'src/common/helpers/decimal-transformer';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ExpenseType } from './expense-type.entity';

@Entity()
export class PersonalExpense extends BaseEntity<PersonalExpense> {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    transformer: decimalTransformer,
  })
  value: number;

  @Column()
  monthlyClosingId: string;

  @ManyToOne(() => MonthlyClosing, (item) => item.personalExpense, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'monthlyClosingId' })
  monthlyClosing: MonthlyClosing;

  @Column()
  expenseTypeId: string;

  @ManyToOne(() => ExpenseType, { nullable: false, eager: true })
  @JoinColumn({ name: 'expenseTypeId' })
  expenseType: ExpenseType;
}
