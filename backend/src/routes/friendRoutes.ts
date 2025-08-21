import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/database";

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
  fastify.get(
    "/",
    async (
      request: FastifyRequest<{ Params: UserIdParams }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;

      try {
        // Join `friends` and `users` to fetch detailed friend info
        const stmt = db.prepare(`
          SELECT u.id, u.username, u.avatar, u.status
          FROM friends f
          JOIN users u ON u.id = f.friendId
          WHERE f.userId = ?
        `);

        const friends = stmt.all(userId) as Friend[];
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
  fastify.get(
    "/search",
    async (
      request: FastifyRequest<{
        Params: UserIdParams;
        Querystring: { q?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;
      const { q = "" } = request.query;

      try {
        // Get list of already-added friends
        const excludeStmt = db.prepare(
          `SELECT friendId FROM friends WHERE userId = ?`
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
            SELECT id, username, avatar, status
            FROM users
            WHERE username LIKE ? AND id NOT IN (${placeholders})
            LIMIT 10
          `);
          users = searchStmt.all(`%${q}%`, ...excludeIds) as Friend[];
        } else {
          // User has no friends yet → only exclude self
          const searchStmt = db.prepare(`
            SELECT id, username, avatar, status
            FROM users
            WHERE username LIKE ?
            LIMIT 10
          `);
          users = searchStmt.all(`%${q}%`) as Friend[];
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
  fastify.post(
    "/:friendId",
    async (
      request: FastifyRequest<{ Params: UserIdParams & FriendIdParams }>,
      reply: FastifyReply
    ) => {
      const { userId, friendId } = request.params;

      try {
        const checkStmt = db.prepare(
          `SELECT 1 FROM friends WHERE userId = ? AND friendId = ?`
        );
        const alreadyExists = checkStmt.get(userId, friendId);

        if (alreadyExists) {
          return reply.status(400).send({ error: "Already friends" });
        }

        const stmt = db.prepare(
          `INSERT INTO friends (userId, friendId) VALUES (?, ?)`
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
  fastify.delete(
    "/:friendId",
    async (
      request: FastifyRequest<{ Params: UserIdParams & FriendIdParams }>,
      reply: FastifyReply
    ) => {
      const { userId, friendId } = request.params;

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
  fastify.get(
    "/:friendId/details",
    async (
      request: FastifyRequest<{ Params: UserIdParams & FriendIdParams }>,
      reply: FastifyReply
    ) => {
      const { friendId } = request.params;

      try {
        // Basic friend info
        const userStmt = db.prepare(
          `SELECT id, username, avatar, status FROM users WHERE id = ?`
        );
        const friend = userStmt.get(friendId) as Friend | undefined;

        if (!friend) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Recent matches
        const matchesStmt = db.prepare(
          `SELECT * FROM matches
           WHERE player1Id = ? OR player2Id = ?
           ORDER BY playedAt DESC
           LIMIT 10`
        );
        const matches = matchesStmt.all(friendId, friendId) as Match[];

        return reply.send({ ...friend, matches });
      } catch (err) {
        console.error("Error fetching friend details:", err);
        return reply.status(500).send({ error: "Failed to fetch friend details" });
      }
    }
  );

  /**
   * 📌 DEBUG ROUTE
   * GET /api/friends/:userId/api/debug/db
   * Returns all users + all friendships.
   * ⚠️ Only use in development.
   */
  fastify.get(
    "/api/debug/db",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const users = db.prepare("SELECT * FROM users").all();
        const friends = db.prepare("SELECT * FROM friends").all();

        return reply.send({ users, friends });
      } catch (err) {
        console.error("Error in debug route:", err);
        return reply.status(500).send({ error: "Failed to fetch debug info" });
      }
    }
  );
}
