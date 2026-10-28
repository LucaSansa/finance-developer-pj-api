import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendEmailVerification(
    receipientEmail: string,
    recipientName: string,
    verificationUrl: string,
  ) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
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
      from: process.env.MAIL_FROM,
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

  async sendEmailChangeConfirmation(
    recipientEmail: string,
    recipientName: string,
    confirmationUrl: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: recipientEmail,
      subject: 'Confirme a troca do seu email',
      text: [
        `Olá, ${recipientName}.`,
        'Foi solicitada uma troca de e-mail para esta conta.',
        `Confirme o novo endereço acessando: ${confirmationUrl}`,
        'Este link expira em 1 hora. Se você não solicitou a troca, ignore esta mensagem.',
      ].join('\n\n'),
      html: `
      <p>Olá, ${recipientName}.</p>
      <p>Foi solicitada uma troca de e-mail para esta conta.</p>
      <p><a href="${confirmationUrl}">Confirmar novo e-mail</a></p>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou a troca, ignore esta mensagem. Seu e-mail atual não será alterado.</p>
    `,
    });
  }
}
