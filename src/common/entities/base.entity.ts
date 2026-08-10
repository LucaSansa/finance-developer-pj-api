import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity as TypeBaseEntity,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity<Model> extends TypeBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    nullable: false,
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
    select: false,
    name: 'updated_at',
  })
  updatedAt?: Date;

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
    select: false,
    name: 'deleted_at',
  })
  deletedAt?: Date;

  constructor(data?: Partial<Model>) {
    super();
    Object.assign(this, data ?? {});
  }
}
