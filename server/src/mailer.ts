import nodemailer from 'nodemailer';
import type { Config } from './config';

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export function createMailer(config: Config): Mailer {
  if (!config.SMTP_URL) {
    if (config.NODE_ENV === 'production') console.warn('SMTP_URL is not set: password-reset emails will not be delivered');
    return {
      async send(to, subject, text) {
        if (config.NODE_ENV !== 'test') console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
      },
    };
  }
  const transport = nodemailer.createTransport(config.SMTP_URL);
  return {
    async send(to, subject, text) {
      await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
    },
  };
}
