import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { UsersService } from './users/users.service';
import { User } from './entities/user.entity';
import { Tenant } from './entities/tenant.entity';
import { Repository } from 'typeorm';

async function run() {
  await AppDataSource.initialize();
  const userRepo: Repository<User> = AppDataSource.getRepository(User);
  const tenantRepo: Repository<Tenant> = AppDataSource.getRepository(Tenant);
  const usersService = new UsersService(null as any, userRepo, tenantRepo);

  const exists = await tenantRepo.count();
  if (exists > 0) {
    console.log('Seed skipped: tenants already exist.');
    await AppDataSource.destroy();
    return;
  }

  const { tenant, owner } = await usersService.createTenantWithOwner({
    tenantName: 'Acme Inc',
    firstName: 'Alice',
    lastName: 'Owner',
    email: 'alice@example.com',
    password: 'Password123!',
  });

  console.log('Seeded tenant:', tenant.tenant_id, 'owner:', owner.email);
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
