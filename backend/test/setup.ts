import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Basic setup for tests
  console.log('Setting up test environment...');
});

afterAll(() => {
  console.log('Cleaning up test environment...');
});
