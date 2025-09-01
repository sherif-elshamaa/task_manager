import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
} from 'typeorm';

export class TenantScopedRepository<T extends { tenant_id: string }> {
  constructor(private readonly repo: Repository<T>) {}

  withTenant(criteria: Partial<T>, tenantId: string): Partial<T> {
    return { ...criteria, tenant_id: tenantId } as Partial<T>;
  }

  async findOneByTenant(
    tenantId: string,
    where: Partial<T>,
    options?: Omit<FindOneOptions<T>, 'where'>,
  ) {
    return this.repo.findOne({
      ...(options || {}),
      where: this.withTenant(where, tenantId) as FindOptionsWhere<T>,
    });
  }

  async findAndCountByTenant(
    tenantId: string,
    options: Omit<FindManyOptions<T>, 'where'> & { where?: Partial<T> },
  ) {
    const { where = {}, ...rest } = options;
    return this.repo.findAndCount({
      ...rest,
      where: this.withTenant(where, tenantId) as FindOptionsWhere<T>,
    });
  }

  async save(entity: T) {
    return this.repo.save(entity);
  }

  async remove(entity: T) {
    return this.repo.remove(entity);
  }
}
