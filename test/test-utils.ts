import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm';

export const clearDatabase = async (app: INestApplication) => {
  const connection = app.get(Connection);
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  }
};
