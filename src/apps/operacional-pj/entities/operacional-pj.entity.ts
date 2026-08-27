import { Invoice } from 'src/apps/invoice/entities/invoice.entity';
import { MonthlyClosing } from 'src/apps/monthly-closing/entities/monthly-closing.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { decimalTransformer } from 'src/common/helpers/decimal-transformer';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

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

  @OneToMany(() => Invoice, (item) => item.operacionalPj, {})
  invoice?: Invoice[];

  @Column()
  monthlyClosingId: string;

  @OneToOne(() => MonthlyClosing, (item) => item.operacionalPj, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'monthlyClosingId' })
  monthlyClosing: MonthlyClosing;
}
