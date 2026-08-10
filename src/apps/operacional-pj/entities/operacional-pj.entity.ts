import { MonthlyClosing } from 'src/apps/monthly-closing/entities/monthly-closing.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { decimalTransformer } from 'src/common/helpers/decimal-transformer';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class OperacionalPj extends BaseEntity<OperacionalPj> {
  @Column({
    transformer: decimalTransformer,
  })
  accountFee: number;

  @Column({
    transformer: decimalTransformer,
  })
  individualContribution: number;

  @Column({
    transformer: decimalTransformer,
  })
  totalInvoiceTax: number;

  @Column()
  monthlyClosingId: string;

  @OneToOne(() => MonthlyClosing, (item) => item.operacionalPj, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'monthlyClosingId' })
  monthlyClosing: MonthlyClosing;
}
