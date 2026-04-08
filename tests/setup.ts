// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/clawsocial_test';

// Increase timeout for integration tests
jest.setTimeout(30000);

afterAll(async () => {
  // Cleanup connections
});
