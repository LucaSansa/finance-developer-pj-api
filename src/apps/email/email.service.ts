import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('MAIL_HOST'),
      port: Number(this.configService.getOrThrow<string>('MAIL_PORT')),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: this.configService.get<string>('MAIL_USER')
        ? {
            user: this.configService.getOrThrow<string>('MAIL_USER'),
            pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
          }
        : undefined,
    });
  }

  async sendEmailVerification(
    receipientEmail: string,
    recipientName: string,
    verificationUrl: string,
  ) {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('MAIL_FROM'),
      to: receipientEmail,
      subject: 'Confirme seu e-mail',
      text: `Olá, ${recipientName}. Confirme seu e-mail acessando: ${verificationUrl}`,
      html: `
        <p>Olá, ${recipientName}.</p>
        <p>Para confirmar seu e-mail e liberar o acesso, clique no link abaixo:</p>
        <p><a href="${verificationUrl}">Confirmar e-mail</a></p>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não solicitou este cadastro, ignore esta mensagem.</p>
      `,
    });
  }
}
