import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SentMail {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: string;
  private readonly clientOrigin: string;
  private readonly from: string;
  private lastMail: SentMail | null = null;

  constructor(private readonly config: ConfigService) {
    this.transport = this.config.get<string>('MAIL_TRANSPORT') ?? 'log';
    this.clientOrigin =
      this.config.get<string>('CLIENT_ORIGIN') ?? 'http://localhost:3000';
    this.from = this.config.get<string>('MAIL_FROM') ?? 'no-reply@tracker.dev';
  }

  async sendInvite(to: string, name: string, rawToken: string): Promise<void> {
    const link = `${this.clientOrigin}/set-password?token=${rawToken}`;
    await this.send({
      to,
      subject: 'You have been invited to Project Tracker',
      text: `Hi ${name},\n\nAn account was created for you. Set your password:\n${link}\n\nThis link expires in 72 hours.`,
    });
  }

  async sendPasswordReset(
    to: string,
    name: string,
    rawToken: string,
  ): Promise<void> {
    const link = `${this.clientOrigin}/reset-password?token=${rawToken}`;
    await this.send({
      to,
      subject: 'Reset your Project Tracker password',
      text: `Hi ${name},\n\nReset your password:\n${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    });
  }

  getLastMail(): SentMail | null {
    return this.lastMail;
  }

  clearMail(): void {
    this.lastMail = null;
  }

  private async send(mail: SentMail): Promise<void> {
    this.lastMail = mail;

    if (this.transport === 'log') {
      this.logger.log(
        `[MAIL:log] to=${mail.to} subject="${mail.subject}"\n${mail.text}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'smtp-relay.brevo.com',
      port: Number(this.config.get<string>('SMTP_PORT') ?? '587'),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass:
          this.config.get<string>('SMTP_PASS') ||
          this.config.get<string>('BREVO_SMTP_Key'),
      },
    });

    await transporter.sendMail({
      from: this.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
  }
}
