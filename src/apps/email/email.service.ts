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

  async sendPasswordReset(
    recipientEmail: string,
    recipientName: string,
    resetUrl: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('MAIL_FROM'),
      to: recipientEmail,
      subject: 'Recuperação de Senha',
      text: `Olá, ${recipientName}. Redefina sua senha acessando o endereço: ${resetUrl}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Recuperação de Senha</h2>
          <p>Olá, <strong>${recipientName}</strong>.</p>
          <p>Recebemos uma solicitação de redefinição de senha para a sua conta de controle financeiro.</p>
          <p>Para prosseguir e redefinir sua senha, clique no botão em destaque e preencha o formulário:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="color: #666; font-size: 14px;">Este link é válido por <strong>1 hora</strong> devido a medidas de segurança.</p>
          <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">Se você não solicitou este procedimento, ignore este e-mail. A sua senha atual permanecerá totalmente segura.</p>
        </div>
      `,
    });
  }
}
