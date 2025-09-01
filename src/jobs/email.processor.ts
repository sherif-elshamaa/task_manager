import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface InviteEmailJobData {
  to: string;
  inviteId: string;
  tenantId: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSend(job: Job<EmailJobData>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just log the email details
      this.logger.log(`Email sent: ${job.data.subject} to ${job.data.to}`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to send email job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('password-reset')
  async handlePasswordReset(
    job: Job<{ email: string; resetToken: string; resetUrl: string }>,
  ) {
    this.logger.log(`Processing password reset email for ${job.data.email}`);

    try {
      // TODO: Send password reset email with reset link
      this.logger.log(`Password reset email sent to ${job.data.email}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log(`Password reset email job completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email:`, error);
      throw error;
    }
  }

  @Process('send-invite-email')
  async handleSendInviteEmail(job: Job<InviteEmailJobData>) {
    this.logger.log(`Processing invite email for ${job.data.to}`);

    try {
      // TODO: Send invite email with invite link
      this.logger.log(
        `Invite email sent to ${job.data.to} for tenant ${job.data.tenantId}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log(`Invite email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to send invite email for job ${job.id}:`,
        error,
      );
      throw error;
    }
  }
}
