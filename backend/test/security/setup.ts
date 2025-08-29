import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Global test database
export let testDb: Database.Database;

beforeAll(async () => {
  // Create a test database
  const testDbPath = path.join(__dirname, '../../test-db.sqlite');
  
  // Remove existing test db if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  testDb = new Database(testDbPath);
  
  // Create tables for testing
  testDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'offline',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      twoFactorSecret TEXT,
      twoFactorEnabled BOOLEAN DEFAULT 0,
      isTemporary BOOLEAN DEFAULT 0,
      language TEXT DEFAULT 'en'
    );
    
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1Id INTEGER NOT NULL,
      player2Id INTEGER,
      player1Score INTEGER NOT NULL,
      player2Score INTEGER NOT NULL,
      winnerId INTEGER,
      gameMode TEXT NOT NULL,
      playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player1Id) REFERENCES users(id),
      FOREIGN KEY (player2Id) REFERENCES users(id),
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `);
});

afterAll(() => {
  if (testDb) {
    testDb.close();
    // Clean up test database
    const testDbPath = path.join(__dirname, '../../test-db.sqlite');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }
});
