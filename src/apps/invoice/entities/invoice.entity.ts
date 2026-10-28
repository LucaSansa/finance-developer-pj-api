import { OperacionalPj } from 'src/apps/operacional-pj/entities/operacional-pj.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { decimalTransformer } from 'src/common/helpers/decimal-transformer';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Invoice extends BaseEntity<Invoice> {
  @Column({
    transformer: decimalTransformer,
  })
  value: number;

  @Column()
  operacionalPjId: string;

  @ManyToOne(() => OperacionalPj, (item) => item.invoice, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'operacionalPjId' })
  operacionalPj: OperacionalPj;
}
