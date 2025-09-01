import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';

export interface NotificationJobData {
  userId: string;
  tenantId: string;
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'comment_added'
    | 'due_date_reminder';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface TaskAssignedJobData {
  tenantId: string;
  assigneeId: string;
  taskId: string;
  assignerId: string;
}

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send')
  async handleSend(job: Job<NotificationJobData>) {
    this.logger.log(
      `Processing notification job ${job.id} for user ${job.data.userId}`,
    );

    try {
      // TODO: Integrate with actual notification service (push notifications, in-app, etc.)
      // For now, just log the notification details
      this.logger.log(
        `Notification sent: ${job.data.title} to user ${job.data.userId}`,
      );

      // Simulate notification processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.logger.log(`Notification job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to send notification job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('due-date-reminder')
  async handleDueDateReminder(
    job: Job<{ taskId: string; userId: string; dueDate: string }>,
  ) {
    this.logger.log(`Processing due date reminder for task ${job.data.taskId}`);

    try {
      // TODO: Send due date reminder notification
      this.logger.log(`Due date reminder sent for task ${job.data.taskId}`);

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.logger.log(`Due date reminder job completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to send due date reminder:`, error);
      throw error;
    }
  }

  @Process('task-assigned')
  async handleTaskAssigned(job: Job<TaskAssignedJobData>) {
    this.logger.log(
      `Processing task assigned notification for user ${job.data.assigneeId}`,
    );

    try {
      // TODO: Create in-app notification
      this.logger.log(
        `Task ${job.data.taskId} assigned to user ${job.data.assigneeId}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.logger.log(
        `Task assigned notification job ${job.id} completed successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send task assigned notification for job ${job.id}:`,
        error,
      );
      throw error;
    }
  }
}
