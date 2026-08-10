import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class ExpenseType extends BaseEntity<ExpenseType> {
  @Column()
  name: string;
}
