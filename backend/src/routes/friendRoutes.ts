import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/database";
import { jwtMiddleware } from "../jwtMiddleware";

// ------------------ TYPES ------------------
type UserIdParams = { userId: string };
type FriendIdParams = { friendId: string };

export type Friend = {
  id: string;
  username: string;
  avatar: string | null;
  status: string; // online / offline / busy etc.
};

type Match = {
  id: string;
  player1Id: string;
  player2Id: string;
  score1: number;
  score2: number;
  playedAt: string;
};

// ------------------ ROUTES ------------------
export default async function friendRoutes(fastify: FastifyInstance) {
  /**
   * 📌 GET /api/friends/:userId
   * Returns the full list of friends for a given user.
   */
  fastify.get<{ Params: UserIdParams }>(
    "/",
    { preHandler: [jwtMiddleware] },
    async (
      request,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;
      const authenticatedUser = (request as any).user;

      // Validate that the userId from URL matches the authenticated user
      if (userId !== authenticatedUser.id) {
        return reply.status(403).send({ error: "You can only view your own friends" });
      }

      try {
        // Join `friends` and `users` to fetch detailed friend info with games count
        const stmt = db.prepare(`
          SELECT u.id, u.username, u.avatar, u.status,
                 COUNT(m.id) as gamesPlayed
          FROM friends f
          JOIN users u ON u.id = f.friendId
          LEFT JOIN matches m ON (m.player1Id = u.id OR m.player2Id = u.id)
          WHERE f.userId = ? AND f.status = 'accepted'
          GROUP BY u.id, u.username, u.avatar, u.status
        `);

        const friends = stmt.all(userId) as (Friend & { gamesPlayed: number })[];
        return reply.send(friends);
      } catch (err) {
        console.error("Error fetching friends:", err);
        return reply.status(500).send({ error: "Failed to fetch friends" });
      }
    }
  );

  /**
   * 📌 GET /api/friends/:userId/search?q=keyword
   * Search for potential new friends by username.
   * Excludes:
   * - The current user (cannot friend yourself)
   * - Already added friends
   */
	fastify.get<{ Params: UserIdParams; Querystring: { q?: string } }>(
	"/search",
	{ preHandler: [jwtMiddleware] },
	async (
		request,
		reply: FastifyReply
	) => {
		const { userId } = request.params;
		const { q = "" } = request.query;
		const authenticatedUser = (request as any).user;

		// Validate that the userId from URL matches the authenticated user
		if (userId !== authenticatedUser.id) {
			return reply.status(403).send({ error: "You can only search for friends for yourself" });
		}

		try {
		// Get list of already-added friends
		const excludeStmt = db.prepare(
			`SELECT friendId FROM friends WHERE userId = ? AND status = 'accepted'`
		);
		const excludeRows = excludeStmt.all(userId) as { friendId: string }[];

		// Collect IDs to exclude (friends + self)
		const excludeIds = excludeRows.map((r) => r.friendId);
		excludeIds.push(userId);

		let users: Friend[];

		if (excludeIds.length > 0) {
			// Exclude friends + self
			const placeholders = excludeIds.map(() => "?").join(",");
			const searchStmt = db.prepare(`
			SELECT u.id, u.username, u.avatar, u.status,
			       COUNT(m.id) as gamesPlayed
			FROM users u
			LEFT JOIN matches m ON (m.player1Id = u.id OR m.player2Id = u.id)
			WHERE u.username LIKE ? AND u.id NOT IN (${placeholders})
			GROUP BY u.id, u.username, u.avatar, u.status
			LIMIT 10
			`);
			users = searchStmt.all(`%${q}%`, ...excludeIds) as (Friend & { gamesPlayed: number })[];
		} else {
			// User has no friends yet → only exclude self
			const searchStmt = db.prepare(`
			SELECT u.id, u.username, u.avatar, u.status,
			       COUNT(m.id) as gamesPlayed
			FROM users u
			LEFT JOIN matches m ON (m.player1Id = u.id OR m.player2Id = u.id)
			WHERE u.username LIKE ? AND u.id != ?
			GROUP BY u.id, u.username, u.avatar, u.status
			LIMIT 10
			`);
			users = searchStmt.all(`%${q}%`, userId) as (Friend & { gamesPlayed: number })[];
		}

		return reply.send(users);
		} catch (err) {
		console.error("Error searching friends:", err);
		return reply.status(500).send({ error: "Failed to search users" });
		}
	}
	);

  /**
   * 📌 POST /api/friends/:userId/:friendId
   * Add a new friend relation (bidirectional).
   */
  fastify.post<{ Params: UserIdParams & FriendIdParams }>(
    "/:friendId",
    { preHandler: [jwtMiddleware] },
    async (
      request,
      reply: FastifyReply
    ) => {
      const { userId, friendId } = request.params;
      const authenticatedUser = (request as any).user;

      // Validate that the userId from URL matches the authenticated user
      if (userId !== authenticatedUser.id) {
        return reply.status(403).send({ error: "You can only add friends for yourself" });
      }

      // Prevent adding yourself as a friend
      if (userId === friendId) {
        return reply.status(400).send({ error: "You cannot add yourself as a friend" });
      }

      try {
        const checkStmt = db.prepare(
          `SELECT 1 FROM friends WHERE userId = ? AND friendId = ? AND status = 'accepted'`
        );
        const alreadyExists = checkStmt.get(userId, friendId);

        if (alreadyExists) {
          return reply.status(400).send({ error: "Already friends" });
        }

        const stmt = db.prepare(
          `INSERT INTO friends (userId, friendId, status) VALUES (?, ?, 'accepted')`
        );

        const tx = db.transaction(() => {
          stmt.run(userId, friendId);
          stmt.run(friendId, userId);
        });

        tx();

        return reply.send({ success: true });
      } catch (err) {
        console.error("Error adding friend:", err);
        return reply.status(500).send({ error: "Failed to add friend" });
      }
    }
  );

  /**
   * 📌 DELETE /api/friends/:userId/:friendId
   * Remove an existing friend relation (bidirectional).
   */
  fastify.delete<{ Params: UserIdParams & FriendIdParams }>(
    "/:friendId",
    { preHandler: [jwtMiddleware] },
    async (
      request,
      reply: FastifyReply
    ) => {
      const { userId, friendId } = request.params;
      const authenticatedUser = (request as any).user;

      // Validate that the userId from URL matches the authenticated user
      if (userId !== authenticatedUser.id) {
        return reply.status(403).send({ error: "You can only remove your own friends" });
      }

      try {
        const stmt = db.prepare(
		`DELETE FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)`
		);

		const result = stmt.run(userId, friendId, friendId, userId);

        if (result.changes === 0) {
          return reply.status(404).send({ error: "Friendship not found" });
        }

        return reply.send({ success: true });
      } catch (err) {
        console.error("Error removing friend:", err);
        return reply.status(500).send({ error: "Failed to remove friend" });
      }
    }
  );


  /**
   * 📌 GET /api/friends/:userId/:friendId/details
   * Get full profile of a friend + their last 10 matches.
   */
  fastify.get<{ Params: UserIdParams & FriendIdParams }>(
    "/:friendId/details",
    { preHandler: [jwtMiddleware] },
    async (
      request,
      reply: FastifyReply
    ) => {
      const { friendId } = request.params;

      try {
        // Basic friend info with games count
        const userStmt = db.prepare(
          `SELECT u.id, u.username, u.avatar, u.status,
                  COUNT(m.id) as gamesPlayed
           FROM users u
           LEFT JOIN matches m ON (m.player1Id = u.id OR m.player2Id = u.id)
           WHERE u.id = ?
           GROUP BY u.id, u.username, u.avatar, u.status`
        );
        const friend = userStmt.get(friendId) as (Friend & { gamesPlayed: number }) | undefined;

        if (!friend) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Recent matches
        const matchesStmt = db.prepare(
          `SELECT m.*, 
                  u1.username as player1Name, u1.avatar as player1Avatar,
                  u2.username as player2Name, u2.avatar as player2Avatar
           FROM matches m
           LEFT JOIN users u1 ON m.player1Id = u1.id
           LEFT JOIN users u2 ON m.player2Id = u2.id
           WHERE m.player1Id = ? OR m.player2Id = ?
           ORDER BY m.playedAt DESC
           LIMIT 10`
        );
        const rawMatches = matchesStmt.all(friendId, friendId) as any[];

        // Transform matches to include proper opponent info and estimated duration
        const recentMatches = rawMatches.map((match) => {
          const isPlayer1 = match.player1Id === friendId;
          const opponent = isPlayer1 ? match.player2Name || 'Guest' : match.player1Name;
          const opponentAvatar = isPlayer1 ? (match.player2Avatar || '/default-avatar.svg') : (match.player1Avatar || '/default-avatar.svg');
          const result = match.winnerId === friendId ? 'win' : 'loss';
          const score = `${match.player1Score}-${match.player2Score}`;
          
          // Generate consistent estimated duration based on match ID (2-4 minutes)
          const estimatedMinutes = (match.id % 3) + 2;
          const duration = `${estimatedMinutes}min`;

          return {
            id: match.id,
            opponent,
            opponentAvatar,
            result,
            score,
            gameMode: match.gameMode,
            duration,
            date: match.playedAt
          };
        });

        return reply.send({ ...friend, recentMatches });
      } catch (err) {
        console.error("Error fetching friend details:", err);
        return reply.status(500).send({ error: "Failed to fetch friend details" });
      }
    }
  );

}