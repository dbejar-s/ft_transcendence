#!/bin/bash

echo "🎮 ft_transcendence Database Reader"
echo "=================================="

DB_PATH="data/transcendence.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

echo ""
echo "📊 Database Summary:"
echo "===================="
echo "👥 Users: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM users;')"
echo "🏓 Matches: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM matches;')"
echo "🏆 Tournaments: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM tournaments;')"
echo "👫 Friendships: $(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM friends;')"

echo ""
echo "👥 Users:"
echo "========="
sqlite3 -header -column $DB_PATH "SELECT username, email, status, language FROM users;"

echo ""
echo "🏓 Recent Matches:"
echo "=================="
sqlite3 -header -column $DB_PATH "
SELECT 
    u1.username as Player1,
    COALESCE(u2.username, '(AI/Bot)') as Player2,
    m.player1Score || '-' || m.player2Score as Score,
    COALESCE(u3.username, 'No Winner') as Winner,
    m.gameMode as Mode,
    DATE(m.playedAt) as Date
FROM matches m 
LEFT JOIN users u1 ON m.player1Id = u1.id 
LEFT JOIN users u2 ON m.player2Id = u2.id 
LEFT JOIN users u3 ON m.winnerId = u3.id 
ORDER BY m.playedAt DESC 
LIMIT 10;
"

echo ""
echo "🏆 Tournaments:"
echo "==============="
TOURNAMENT_COUNT=$(sqlite3 $DB_PATH 'SELECT COUNT(*) FROM tournaments;')
if [ "$TOURNAMENT_COUNT" -gt 0 ]; then
    sqlite3 -header -column $DB_PATH "SELECT name, gameMode, status, maxPlayers FROM tournaments;"
else
    echo "No tournaments created yet."
fi

echo ""
echo "💡 Available commands:"
echo "   sqlite3 $DB_PATH                    # Interactive mode"
echo "   sqlite3 $DB_PATH '.schema'          # Show all table schemas"
echo "   sqlite3 $DB_PATH 'SELECT * FROM users;'  # View all users"
