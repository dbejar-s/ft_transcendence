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
      twofa_expires DATETIME,
      isTemporary INTEGER DEFAULT 0 -- Add isTemporary column directly in table creation
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
      player2Id TEXT,
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
      status TEXT DEFAULT 'registration', -- registration, ongoing, finished
      phase TEXT DEFAULT 'registration',
      maxPlayers INTEGER DEFAULT 16,
      winnerId TEXT,
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `;

  const createTournamentParticipantsTable = `
    CREATE TABLE IF NOT EXISTS tournament_participants (
      tournamentId INTEGER NOT NULL,
      userId TEXT,
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
      player2Id TEXT,
      player1Score INTEGER DEFAULT 0,
      player2Score INTEGER DEFAULT 0,
      winnerId TEXT,
      round INTEGER DEFAULT 1,
      phase TEXT DEFAULT 'round_robin', -- round_robin, winners_bracket, losers_bracket, final_bracket
      status TEXT DEFAULT 'pending', -- pending, finished
      source TEXT DEFAULT 'played', -- 'played' for real games, 'manual' for manually added scores
      playedAt DATETIME,
      FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
      FOREIGN KEY (player1Id) REFERENCES users(id),
      FOREIGN KEY (player2Id) REFERENCES users(id),
      FOREIGN KEY (winnerId) REFERENCES users(id)
    );
  `;

  // Create all tables
  db.exec(createUserTable);
  db.exec(createMatchesTable);
  db.exec(createTournamentsTable);
  db.exec(createTournamentParticipantsTable);
  db.exec(createTournamentMatchesTable);
  db.exec(createFriendsTable);

  // Migration: Update matches table to allow NULL player2Id for casual games
  try {
    // Check if the table has the old schema with NOT NULL constraint
    const tableInfo = db.prepare("PRAGMA table_info(matches)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;
    const player2IdColumn = tableInfo.find((col) => col.name === 'player2Id');
    
    if (player2IdColumn && player2IdColumn.notnull === 1) {
      console.log('Migrating matches table to allow NULL player2Id...');
      
      // Step 1: Create new table with correct schema
      db.exec(`
        CREATE TABLE matches_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player1Id TEXT NOT NULL,
          player2Id TEXT,
          player1Score INTEGER NOT NULL,
          player2Score INTEGER NOT NULL,
          winnerId TEXT,
          gameMode TEXT NOT NULL,
          playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player1Id) REFERENCES users(id),
          FOREIGN KEY (player2Id) REFERENCES users(id),
          FOREIGN KEY (winnerId) REFERENCES users(id)
        )
      `);
      
      // Step 2: Copy data from old table
      db.exec(`
        INSERT INTO matches_new (id, player1Id, player2Id, player1Score, player2Score, winnerId, gameMode, playedAt)
        SELECT id, player1Id, player2Id, player1Score, player2Score, winnerId, gameMode, playedAt FROM matches
      `);
      
      // Step 3: Drop old table and rename new table
      db.exec('DROP TABLE matches');
      db.exec('ALTER TABLE matches_new RENAME TO matches');
      
      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Add columns if they don't exist (migration for existing databases)
  try {
    // Try to add phase column if it doesn't exist
    db.exec('ALTER TABLE tournament_matches ADD COLUMN phase TEXT DEFAULT "round_robin"');
    console.log('Added phase column to tournament_matches');
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    // Try to add isTemporary column if it doesn't exist
    db.exec('ALTER TABLE users ADD COLUMN isTemporary INTEGER DEFAULT 0');
    console.log('Added isTemporary column to users');
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    // Try to add source column to tournament_matches if it doesn't exist
    db.exec('ALTER TABLE tournament_matches ADD COLUMN source TEXT DEFAULT "played"');
    console.log('Added source column to tournament_matches');
  } catch (error) {
    // Column already exists, ignore error
  }

  console.log('Database tables initialized successfully.');
  console.log("Using DB at: ", dbPath);
}

// Initialize the database when this module is imported
initializeDatabase();