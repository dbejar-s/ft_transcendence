import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'transcendence.db');

// Initialize the database connection
export const db = new Database(dbPath, { verbose: console.log });

function initializeDatabase() {
  console.log('Initializing database tables...');

  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE,
      password TEXT,
      avatar TEXT,
      googleId TEXT UNIQUE,
      status TEXT DEFAULT 'offline',
      language TEXT DEFAULT 'en',
      twofa_enabled INTEGER DEFAULT 0, -- 0 = false, 1 = true
      twofa_code TEXT,
      twofa_expires DATETIME
    );
  `;

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

  const createTournamentsTable = `
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gameMode TEXT NOT NULL,
      status TEXT DEFAULT 'registration', -- registration, group, elimination, finished
      phase TEXT DEFAULT 'registration',
      maxPlayers INTEGER DEFAULT 16,
      startDate DATETIME,
      endDate DATETIME,
      winnerId TEXT,
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `;

  const createTournamentParticipantsTable = `
    CREATE TABLE IF NOT EXISTS tournament_participants (
      tournamentId INTEGER NOT NULL,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'registered', -- registered, eliminated, winner
      PRIMARY KEY (tournamentId, userId),
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `;

  const createTournamentMatchesTable = `
    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournamentId INTEGER NOT NULL,
      player1Id TEXT NOT NULL,
      player2Id TEXT NOT NULL,
      player1Score INTEGER DEFAULT 0,
      player2Score INTEGER DEFAULT 0,
      winnerId TEXT,
      round INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending', -- pending, finished
      playedAt DATETIME,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
      FOREIGN KEY (player1Id) REFERENCES users(id),
      FOREIGN KEY (player2Id) REFERENCES users(id),
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `;

  db.exec(createUserTable);
  db.exec(createFriendsTable);
  db.exec(createMatchesTable);
  db.exec(createTournamentsTable);
  db.exec(createTournamentParticipantsTable);
  db.exec(createTournamentMatchesTable);

  console.log('Database tables initialized successfully.');

  console.log("Using DB at: ", path.resolve('transcendence.db'));
}

initializeDatabase();
