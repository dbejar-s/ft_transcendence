import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join('/usr/src/app', 'transcendence.db');

// Initialize the database connection
export const db = new Database(dbPath, { verbose: console.log });

// Function to create tables if they don't exist
function initializeDatabase() {
  console.log('Initializing database tables...');

  // User table schema
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE,
      password TEXT,
      avatar TEXT,
      googleId TEXT UNIQUE,
      status TEXT DEFAULT 'offline',
      language TEXT DEFAULT 'en'
    );
  `;

  // Friends table schema (junction table for many-to-many relationship)
  const createFriendsTable = `
    CREATE TABLE IF NOT EXISTS friends (
      userId TEXT NOT NULL,
      friendId TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, accepted
      PRIMARY KEY (userId, friendId),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (friendId) REFERENCES users(id)
    );
  `;

  // Match History table schema
  const createMatchesTable = `
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1Id TEXT NOT NULL,
      player2Id TEXT NOT NULL,
      player1Score INTEGER NOT NULL,
      player2Score INTEGER NOT NULL,
      winnerId TEXT,
      gameMode TEXT NOT NULL,
      playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player1Id) REFERENCES users(id),
      FOREIGN KEY (player2Id) REFERENCES users(id),
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `;

  // Execute the table creation statements
  db.exec(createUserTable);
  db.exec(createFriendsTable);
  db.exec(createMatchesTable);

  console.log('Database tables initialized successfully.');
}

// Call the initialization function
initializeDatabase();
