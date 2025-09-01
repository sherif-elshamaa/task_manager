import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Tracer } from '@opentelemetry/api';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @Inject('TRACER') private readonly tracer: Tracer,
    @InjectRepository(Comment)
    private readonly commentsRepo: Repository<Comment>,
  ) {}

  async create(input: {
    tenantId: string;
    userId: string;
    taskId: string;
    dto: { text: string };
  }) {
    return this.tracer.startActiveSpan(
      'CommentsService.create',
      async (span) => {
        span.setAttributes({
          'tenant.id': input.tenantId,
          'user.id': input.userId,
          'task.id': input.taskId,
        });
        const comment = this.commentsRepo.create({
          tenant_id: input.tenantId,
          task_id: input.taskId,
          text: input.dto.text,
          created_by: input.userId,
        } as Comment);
        const savedComment = await this.commentsRepo.save(comment);
        span.setAttribute('comment.id', savedComment.comment_id);
        span.end();
        return savedComment;
      },
    );
  }

  async list(input: {
    tenantId: string;
    taskId: string;
    page?: number;
    limit?: number;
  }) {
    return this.tracer.startActiveSpan('CommentsService.list', async (span) => {
      const { tenantId, taskId, page = 1, limit = 10 } = input;
      span.setAttributes({
        'tenant.id': tenantId,
        'task.id': taskId,
      });
      const [items, total] = await this.commentsRepo.findAndCount({
        where: { tenant_id: tenantId, task_id: taskId },
        order: { created_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      span.end();
      return { items, total, page, limit };
    });
  }

  async findOne(input: { tenantId: string; commentId: string }) {
    return this.tracer.startActiveSpan(
      'CommentsService.findOne',
      async (span) => {
        span.setAttributes({
          'tenant.id': input.tenantId,
          'comment.id': input.commentId,
        });
        const result = await this.commentsRepo.findOne({
          where: { comment_id: input.commentId, tenant_id: input.tenantId },
        });
        span.end();
        return result;
      },
    );
  }

  async update(input: {
    tenantId: string;
    commentId: string;
    userId?: string;
    taskId?: string;
    text?: string;
    dto?: { text: string };
  }) {
    return this.tracer.startActiveSpan(
      'CommentsService.update',
      async (span) => {
        span.setAttributes({
          'tenant.id': input.tenantId,
          'comment.id': input.commentId,
          'user.id': input.userId,
        });

        const comment = await this.commentsRepo.findOne({
          where: { comment_id: input.commentId, tenant_id: input.tenantId },
        });
        if (!comment) {
          span.end();
          return null;
        }
        const newText = input.dto?.text ?? input.text ?? comment.text;
        comment.text = newText;
        const savedComment = await this.commentsRepo.save(comment);
        span.end();
        return savedComment;
      },
    );
  }

  async remove(input: {
    tenantId: string;
    commentId: string;
    userId?: string;
    taskId?: string;
  }) {
    return this.tracer.startActiveSpan(
      'CommentsService.remove',
      async (span) => {
        span.setAttributes({
          'tenant.id': input.tenantId,
          'comment.id': input.commentId,
          'user.id': input.userId,
        });
        const comment = await this.commentsRepo.findOne({
          where: { comment_id: input.commentId, tenant_id: input.tenantId },
        });
        if (!comment) {
          span.end();
          return null;
        }
        await this.commentsRepo.remove(comment);
        span.end();
        return { deleted: true };
      },
    );
  }

  async listAll(input: {
    tenantId?: string;
    taskId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.tracer.startActiveSpan(
      'CommentsService.listAll',
      async (span) => {
        const { tenantId, taskId, page = 1, limit = 10 } = input;
        const qb = this.commentsRepo.createQueryBuilder('c');

        if (tenantId) {
          span.setAttribute('tenant.id', tenantId);
          qb.andWhere('c.tenant_id = :tenantId', { tenantId });
        }
        if (taskId) {
          span.setAttribute('task.id', taskId);
          qb.andWhere('c.task_id = :taskId', { taskId });
        }

        const [items, total] = await qb
          .orderBy('c.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        span.end();
        return { items, total, page, limit };
      },
    );
  }
}
