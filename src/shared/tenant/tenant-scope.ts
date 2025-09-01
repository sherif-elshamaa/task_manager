import {
  Repository,
  FindOptionsWhere,
  FindOptionsOrder,
  ObjectLiteral,
} from 'typeorm';

export function withTenant<T extends ObjectLiteral>(
  criteria: FindOptionsWhere<T>,
  tenantId: string,
  tenantKey = 'tenant_id',
): FindOptionsWhere<T> {
  if (tenantKey.includes('.')) {
    const [relation, key] = tenantKey.split('.');
    return {
      ...criteria,
      [relation]: {
        [key]: tenantId,
      },
    };
  }
  return {
    ...criteria,
    [tenantKey]: tenantId,
  };
}

export async function findOneByTenant<T extends ObjectLiteral>(
  repo: Repository<T>,
  tenantId: string,
  where: FindOptionsWhere<T>,
  tenantKey = 'tenant_id',
): Promise<T | null> {
  return repo.findOne({
    where: withTenant(where, tenantId, tenantKey),
  });
}

export async function findAndCountByTenant<T extends ObjectLiteral>(
  repo: Repository<T>,
  tenantId: string,
  options: {
    where?: FindOptionsWhere<T>;
    skip?: number;
    take?: number;
    order?: FindOptionsOrder<T>;
  },
  tenantKey = 'tenant_id',
): Promise<[T[], number]> {
  const { where = {}, skip, take, order } = options;
  return repo.findAndCount({
    where: withTenant(where, tenantId, tenantKey),
    skip,
    take,
    order,
  });
}
