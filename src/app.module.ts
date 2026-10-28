import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './apps/user/user.module';
import { AuthModule } from './apps/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MonthlyClosingModule } from './apps/monthly-closing/monthly-closing.module';
import { OperacionalPjModule } from './apps/operacional-pj/operacional-pj.module';
import { PersonalExpensesModule } from './apps/personal-expenses/personal-expenses.module';
import { InvoiceModule } from './apps/invoice/invoice.module';

const migrationsPath = 'dist/migrations/*{.ts,.js}';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      uuidExtension: 'uuid-ossp' as const,
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: true,
      migrations: [migrationsPath],
    }),
    UserModule,
    AuthModule,
    MonthlyClosingModule,
    OperacionalPjModule,
    InvoiceModule,
    PersonalExpensesModule,
  ],
})
export class AppModule {}
