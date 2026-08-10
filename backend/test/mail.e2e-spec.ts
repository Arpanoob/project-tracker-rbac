import { INestApplication } from '@nestjs/common';
import { MailService } from '../src/mail/mail.service';
import { createTestApp } from './helpers';

describe('MailService (e2e, log transport)', () => {
  let app: INestApplication;
  let mail: MailService;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    mail = app.get(MailService);
  });
  afterAll(async () => app.close());

  it('captures an invite email with a set-password link', async () => {
    mail.clearMail();
    await mail.sendInvite('newbie@test.dev', 'Newbie', 'RAWTOKEN123');
    const sent = mail.getLastMail();
    expect(sent?.to).toBe('newbie@test.dev');
    expect(sent?.text).toContain('/set-password?token=RAWTOKEN123');
  });

  it('captures a reset email with a reset-password link', async () => {
    mail.clearMail();
    await mail.sendPasswordReset('newbie@test.dev', 'Newbie', 'RESET456');
    expect(mail.getLastMail()?.text).toContain('/reset-password?token=RESET456');
  });
});
