#!/bin/bash

echo "🔍 ft_transcendence Database Inspector (Including Password Hashes)"
echo "=================================================================="

DB_PATH="data/transcendence.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This script displays password hashes for debugging purposes only!"
echo "    Never share this output in production or with unauthorized personnel."
echo ""

read -p "🔐 Are you sure you want to view password hashes? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "📊 Database Summary:"
echo "===================="
echo "👥 Users: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM users;')"
echo "🏓 Matches: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM matches;')"
echo "🏆 Tournaments: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM tournaments;')"
echo "👫 Friendships: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM friends;')"

echo ""
echo "👥 Users with Password Hashes:"
echo "=============================="
sqlite3 -header -column $DB_PATH "
SELECT 
    username,
    email,
    status,
    language,
    CASE 
        WHEN password IS NULL OR password = '' THEN '[NO PASSWORD - OAuth User]'
        ELSE password
    END as password_hash,
    CASE 
        WHEN password IS NULL OR password = '' THEN 'OAuth'
        WHEN password LIKE '\$2b\$%' THEN 'bcrypt'
        WHEN password LIKE '\$2a\$%' THEN 'bcrypt (old)'
        ELSE 'Unknown'
    END as hash_type,
    twofa_enabled,
    isTemporary
FROM users 
ORDER BY username;
"

echo ""
echo "🔐 Password Hash Analysis:"
echo "=========================="

# Count different password types
TOTAL_USERS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users;")
BCRYPT_HASHES=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users WHERE password LIKE '\$2%';")
OAUTH_USERS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users WHERE password IS NULL OR password = '';")
OTHER_HASHES=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM users WHERE password IS NOT NULL AND password != '' AND password NOT LIKE '\$2%';")

echo "📈 Hash Type Distribution:"
echo "  • bcrypt hashes: $BCRYPT_HASHES"
echo "  • OAuth users (no password): $OAUTH_USERS"
echo "  • Other/Unknown hashes: $OTHER_HASHES"
echo "  • Total users: $TOTAL_USERS"

echo ""
echo "🔍 Detailed Hash Information:"
echo "============================="

sqlite3 $DB_PATH "
SELECT 
    username,
    CASE 
        WHEN password IS NULL OR password = '' THEN 'No password stored'
        ELSE 'Hash: ' || SUBSTR(password, 1, 20) || '...' || SUBSTR(password, -10)
    END as hash_preview,
    CASE 
        WHEN password IS NULL OR password = '' THEN 0
        ELSE LENGTH(password)
    END as hash_length,
    CASE 
        WHEN password LIKE '\$2b\$10\$%' THEN 'bcrypt, 10 rounds (secure)'
        WHEN password LIKE '\$2b\$12\$%' THEN 'bcrypt, 12 rounds (very secure)'
        WHEN password LIKE '\$2a\$%' THEN 'bcrypt (older version)'
        WHEN password IS NULL OR password = '' THEN 'OAuth user'
        ELSE 'Non-standard hash'
    END as security_level
FROM users 
ORDER BY username;
" | column -t -s '|'

echo ""
echo "🏓 Recent Matches with User Details:"
echo "===================================="
sqlite3 -header -column $DB_PATH "
SELECT 
    u1.username as Player1,
    COALESCE(u2.username, '(AI/Bot)') as Player2,
    m.player1Score || '-' || m.player2Score as Score,
    COALESCE(u3.username, 'No Winner') as Winner,
    m.gameMode as Mode,
    DATE(m.playedAt) as Date,
    TIME(m.playedAt) as Time
FROM matches m 
LEFT JOIN users u1 ON m.player1Id = u1.id 
LEFT JOIN users u2 ON m.player2Id = u2.id 
LEFT JOIN users u3 ON m.winnerId = u3.id 
ORDER BY m.playedAt DESC 
LIMIT 10;
"

echo ""
echo "👫 Friend Relationships:"
echo "======================="
FRIENDSHIP_COUNT=$(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM friends;')
if [ "$FRIENDSHIP_COUNT" -gt 0 ]; then
    sqlite3 -header -column $DB_PATH "
    SELECT 
        u1.username as User,
        u2.username as Friend,
        f.status as Status
    FROM friends f 
    JOIN users u1 ON f.userId = u1.id 
    JOIN users u2 ON f.friendId = u2.id
    ORDER BY u1.username, u2.username;
    "
else
    echo "No friend relationships found."
fi

echo ""
echo "🏆 Tournament Information:"
echo "========================="
TOURNAMENT_COUNT=$(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM tournaments;')
if [ "$TOURNAMENT_COUNT" -gt 0 ]; then
    sqlite3 -header -column $DB_PATH "
    SELECT 
        id,
        name,
        gameMode,
        status,
        phase,
        maxPlayers,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournamentId = tournaments.id) as current_players
    FROM tournaments
    ORDER BY id;
    "
else
    echo "No tournaments found."
fi

echo ""
echo "🔧 Raw SQL Commands for Manual Inspection:"
echo "=========================================="
echo "sqlite3 $DB_PATH"
echo "  .tables                              # List all tables"
echo "  .schema users                        # Show users table structure"
echo "  SELECT * FROM users;                 # View all users"
echo "  SELECT username, password FROM users WHERE password IS NOT NULL; # View only users with passwords"
echo "  .quit                                # Exit sqlite3"

echo ""
echo "⚠️  SECURITY REMINDER:"
echo "====================="
echo "• Password hashes shown above are for debugging/verification only"
echo "• Never log or share these hashes in production"
echo "• bcrypt hashes are secure but should still be protected"
echo "• This information should only be accessed by authorized administrators"
