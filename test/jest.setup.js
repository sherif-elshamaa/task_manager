// Jest setup for e2e tests
jest.setTimeout(30000);

// Increase timeout for beforeAll hooks
beforeAll(async () => {
  // Wait a bit for services to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
}, 30000);
