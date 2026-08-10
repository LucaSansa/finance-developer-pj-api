import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultExpenseType1765994220255 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO expense_type (name)
      VALUES
        ('Aluguel'),
        ('Condomínio'),
        ('Cartão de Crédito'),
        ('Água'),
        ('Energia'),
        ('Internet'),
        ('Financiamento'),
        ('Alimentação'),
        ('Transporte'),
        ('Saúde'),
        ('Educação'),
        ('Lazer'),
        ('Seguros'),
        ('Investimentos'),
        ('Impostos'),
        ('Doações'),
        ('Outros');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM expense_type
      WHERE name IN (
        'Aluguel',
        'Condomínio',
        'Cartão de Crédito',
        'Água',
        'Energia',
        'Internet',
        'Financiamento',
        'Alimentação',
        'Transporte',
        'Saúde',
        'Educação',
        'Lazer',
        'Seguros',
        'Investimentos',
        'Impostos',
        'Doações',
        'Outros'
      );
    `);
  }
}
