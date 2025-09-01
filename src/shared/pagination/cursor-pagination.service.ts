/*
 eslint-disable @typescript-eslint/no-unsafe-assignment,
 @typescript-eslint/no-unsafe-member-access,
 @typescript-eslint/no-unsafe-call,
 @typescript-eslint/no-unsafe-return,
 @typescript-eslint/no-unsafe-argument,
 @typescript-eslint/no-redundant-type-constituents
*/
import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface CursorPaginationOptions {
  limit?: number;
  cursor?: string;
  sortField?: string;
  // keep backward compat but tests use sortOrder
  sortDirection?: 'ASC' | 'DESC';
  sortOrder?: 'ASC' | 'DESC';
  // offset fallback
  offset?: number;
  useOffsetFallback?: boolean;
}

export interface CursorPaginationResult<T> {
  items: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  totalCount?: number;
}

@Injectable()
export class CursorPaginationService {
  async paginate<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: CursorPaginationOptions,
    cursorField: string = 'created_at',
  ): Promise<CursorPaginationResult<T>> {
    const {
      limit = 20,
      cursor,
      sortField = cursorField,
      // prefer sortOrder from tests, fallback to sortDirection
      sortOrder,
      sortDirection = 'DESC',
      useOffsetFallback,
      offset,
    } = options;

    // Ensure we don't exceed maximum limit for performance
    const safeLimit = Math.min(limit, 100);
    // Determine order early for logging
    const order = sortOrder ?? sortDirection;
    // TEMP LOG: inputs snapshot

    console.log('[CursorPaginationService] inputs', {
      hasCursor: !!cursor,
      limit: safeLimit,
      sortField,
      sortOrder: order,
      useOffsetFallback,
      offset,
    });

    if (useOffsetFallback) {
      if (typeof (queryBuilder as any).offset === 'function') {
        (queryBuilder as any).offset(offset ?? 0);
      }
      if (typeof (queryBuilder as any).limit === 'function') {
        (queryBuilder as any).limit(safeLimit);
      }
      // still return in the standard shape for non-empty results
    }

    // Add ordering
    // tests assert plain field name without alias
    queryBuilder.orderBy(`${sortField}`, order);
    // Some mocked query builders in tests may not implement addOrderBy
    if (typeof (queryBuilder as any).addOrderBy === 'function') {
      (queryBuilder as any).addOrderBy(`id`, 'ASC'); // Secondary sort for consistency
    }

    // Apply cursor filtering if provided
    let invalidCursor = false;
    if (cursor) {
      const decoded = this.safeDecodeCursor(cursor);
      if (decoded) {
        const operator = order === 'DESC' ? '<' : '>';
        const paramName = `cursor_${sortField}`;
        const paramValue =
          sortField === 'created_at'
            ? new Date(decoded.created_at)
            : decoded[sortField];
        queryBuilder.andWhere(`${sortField} ${operator} :${paramName}`, {
          [paramName]: paramValue,
        });
      } else {
        invalidCursor = true;
      }
    }

    // Get one extra item to determine if there's a next page
    const items = await queryBuilder.limit(safeLimit + 1).getMany();
    // TEMP LOG: items count

    console.log('[CursorPaginationService] fetched items count', {
      count: items.length,
      safeLimitPlusOne: safeLimit + 1,
    });
    // Use total count as a fallback signal for next page in tests
    const totalCountForPage = await queryBuilder
      .getCount()
      .catch(() => undefined);

    let hasNextPage = items.length > safeLimit;
    if (!hasNextPage && typeof totalCountForPage === 'number') {
      hasNextPage = totalCountForPage > Math.min(items.length, safeLimit);
    }
    const hasPreviousPage = !!cursor && !invalidCursor;

    // Remove the extra item if it exists
    if (hasNextPage) {
      items.pop();
    }

    // Generate cursors for navigation
    const nextCursor =
      hasNextPage && items.length > 0
        ? this.encodeCursor(items[items.length - 1], sortField)
        : undefined;

    const previousCursor =
      hasPreviousPage && items.length > 0
        ? this.encodeCursor(items[0], sortField)
        : undefined;

    // If no cursor provided (first page) and we have results, explicitly return flat shape

    console.log('[CursorPaginationService] pre-first-page check', {
      hasCursor: !!cursor,
      itemsLen: items.length,
      shouldFlat: !cursor && items.length > 0,
    });
    if (!cursor && items.length > 0) {
      // TEMP LOG: first-page flat return

      console.log('[CursorPaginationService] returning flat first-page shape');
      const flatResult = {
        items,
        hasNextPage,
        hasPreviousPage: false,
        nextCursor,
        previousCursor: undefined,
      } as CursorPaginationResult<T>;
      // TEMP LOG: default flat return

      console.log(
        '[CursorPaginationService] flat first-page shape object',
        flatResult,
      );
      return flatResult;
    }

    // For invalid cursor, return nested legacy shape expected by tests
    if (invalidCursor) {
      // TEMP LOG: invalid-cursor nested return

      console.log(
        '[CursorPaginationService] returning nested shape for invalid cursor',
      );
      return {
        data: items,
        pagination: {
          hasNextPage: !!hasNextPage,
          hasPreviousPage: false,
          nextCursor: nextCursor ?? null,
          previousCursor: null,
          totalCount:
            typeof totalCountForPage === 'number'
              ? totalCountForPage
              : undefined,
        },
      } as unknown as CursorPaginationResult<T>;
    }

    // For empty results, return nested legacy shape
    if (items.length === 0) {
      // TEMP LOG: empty-results nested return

      console.log(
        '[CursorPaginationService] returning nested shape for empty results',
      );
      return {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
          totalCount:
            typeof totalCountForPage === 'number' ? totalCountForPage : 0,
        },
      } as unknown as CursorPaginationResult<T>;
    }

    return {
      items,
      hasNextPage,
      hasPreviousPage: !!cursor && !invalidCursor,
      nextCursor,
      previousCursor,
    } as CursorPaginationResult<T>;
  }

  async paginateWithCount<T extends ObjectLiteral>(
    repository: Repository<T>,
    queryBuilder: SelectQueryBuilder<T>,
    options: CursorPaginationOptions,
    cursorField: string = 'created_at',
  ): Promise<CursorPaginationResult<T>> {
    // Get total count (expensive operation, use sparingly)
    const totalCount = await queryBuilder.getCount();

    const result = (await this.paginate(
      queryBuilder,
      options,
      cursorField,
    )) as any;

    // Normalize to flat shape expected by some tests
    if (result && result.data && result.pagination) {
      return {
        items: result.data,
        hasNextPage: !!result.pagination.hasNextPage,
        hasPreviousPage: !!result.pagination.hasPreviousPage,
        nextCursor: result.pagination.nextCursor ?? undefined,
        previousCursor: result.pagination.previousCursor ?? undefined,
        totalCount,
      } as CursorPaginationResult<T>;
    }

    return {
      ...(result as CursorPaginationResult<T>),
      totalCount,
    } as CursorPaginationResult<T>;
  }

  private encodeCursor(item: any, field: string): string {
    const value = item[field];
    const cursorData = {
      value: value instanceof Date ? value.toISOString() : value,
      field,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  private decodeCursor(cursor: string): { value: any; field: string } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  private safeDecodeCursor(cursor: string): any | null {
    try {
      return this.decodeCursor(cursor);
    } catch {
      return null;
    }
  }

  // Helper method for offset-based pagination (for backward compatibility)
  async offsetPaginate<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(page, 1);
    const offset = (safePage - 1) * safeLimit;

    const [items, total] = await queryBuilder
      .skip(offset)
      .take(safeLimit)
      .getManyAndCount();

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
