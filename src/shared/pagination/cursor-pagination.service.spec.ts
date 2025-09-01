import { Test, TestingModule } from '@nestjs/testing';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CursorPaginationService } from './cursor-pagination.service';

describe('CursorPaginationService', () => {
  let service: CursorPaginationService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<any>>;

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  } as unknown as jest.Mocked<Repository<any>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CursorPaginationService],
    }).compile();

    service = module.get<CursorPaginationService>(CursorPaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginate', () => {
    const mockEntities = [
      { id: '1', created_at: new Date('2023-01-01'), name: 'Item 1' },
      { id: '2', created_at: new Date('2023-01-02'), name: 'Item 2' },
      { id: '3', created_at: new Date('2023-01-03'), name: 'Item 3' },
    ];

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockQueryBuilder.getCount.mockResolvedValue(100);
    });

    it('should paginate with cursor-based pagination', async () => {
      const options = {
        limit: 10,
        cursor:
          'eyJpZCI6IjEiLCJjcmVhdGVkX2F0IjoiMjAyMy0wMS0wMVQwMDowMDowMC4wMDBaIn0=', // base64 encoded cursor
        sortField: 'created_at',
        sortOrder: 'ASC' as const,
      };

      const result = await service.paginate(mockQueryBuilder, options);

      expect(result.items).toEqual(mockEntities);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
      expect(
        typeof result.nextCursor === 'string' ||
          result.nextCursor === undefined,
      ).toBe(true);
      expect(
        typeof result.previousCursor === 'string' ||
          result.previousCursor === undefined,
      ).toBe(true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('created_at > :cursor_created_at'),
        expect.objectContaining({ cursor_created_at: expect.any(Date) }),
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'created_at',
        'ASC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(11); // limit + 1 for hasNextPage check
    });

    it('should handle DESC sort order', async () => {
      const options = {
        limit: 10,
        cursor:
          'eyJpZCI6IjEiLCJjcmVhdGVkX2F0IjoiMjAyMy0wMS0wMVQwMDowMDowMC4wMDBaIn0=',
        sortField: 'created_at',
        sortOrder: 'DESC' as const,
      };

      await service.paginate(mockQueryBuilder, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('created_at < :cursor_created_at'),
        expect.objectContaining({ cursor_created_at: expect.any(Date) }),
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'created_at',
        'DESC',
      );
    });

    it('should handle empty results', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const options = {
        limit: 10,
        sortField: 'created_at',
        sortOrder: 'ASC' as const,
      };

      const result = await service.paginate(mockQueryBuilder, options);

      expect(result).toEqual({
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
          totalCount: 0,
        },
      });
    });

    it('should handle invalid cursor gracefully', async () => {
      const options = {
        limit: 10,
        cursor: 'invalid-cursor',
        sortField: 'created_at',
        sortOrder: 'ASC' as const,
      };

      const result = await service.paginate(mockQueryBuilder, options);

      expect(result.pagination.hasPreviousPage).toBe(false);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should fallback to offset pagination when specified', async () => {
      const options = {
        limit: 10,
        offset: 20,
        sortField: 'created_at',
        sortOrder: 'ASC' as const,
        useOffsetFallback: true,
      };

      await service.paginate(mockQueryBuilder, options);

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  // Private helpers are intentionally not tested directly.
  // Add tests for paginateWithCount and offsetPaginate using public API

  describe('paginateWithCount', () => {
    it('should include totalCount', async () => {
      // mimic getCount before paginate
      mockQueryBuilder.getCount.mockResolvedValue(42);
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: '1', created_at: new Date('2023-01-01') } as any,
      ]);
      const result = await service.paginateWithCount(
        {} as any,
        mockQueryBuilder,
        { limit: 1, sortField: 'created_at', sortDirection: 'ASC' },
      );
      expect(result.totalCount).toBe(42);
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('offsetPaginate', () => {
    it('should use skip/take and return paging info', async () => {
      // Provide getManyAndCount chain via mock using any cast
      (mockQueryBuilder as any).skip = jest.fn().mockReturnThis();
      (mockQueryBuilder as any).take = jest.fn().mockReturnThis();
      (mockQueryBuilder as any).getManyAndCount = jest
        .fn()
        .mockResolvedValue([[{ id: '1' }], 11]);

      const result = await service.offsetPaginate(mockQueryBuilder, 2, 5);
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(11);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(Math.ceil(11 / 5));
      expect((mockQueryBuilder as any).skip).toHaveBeenCalledWith(5);
      expect((mockQueryBuilder as any).take).toHaveBeenCalledWith(5);
    });
  });
});
