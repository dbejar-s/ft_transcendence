// backend/src/routes/matchRoutes.ts
import { FastifyInstance } from 'fastify';
import net from 'net';
import { startWsProxy } from '../wsProxy';

// This counter helps create unique WebSocket ports for each new game,
// preventing conflicts if multiple games are running.
let gameIdCounter = 0;

export async function matchRoutes(fastify: FastifyInstance) {
  fastify.post('/start', async (request, reply) => {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(4000, 'pong-server', () => {
        console.log('Backend connected to pong-server to request a new game.');
        const PROTOCOL_VERSION = 0;
        const MESSAGE_CLIENT_START = 0; // This tells the server to create a new game
        const startMsg = Buffer.alloc(4);
        startMsg.writeUInt8(PROTOCOL_VERSION, 0);
        startMsg.writeUInt8(MESSAGE_CLIENT_START, 1);
        startMsg.writeUInt16BE(0, 2); // Length is 0 for this message type
        client.write(startMsg);
      });

      client.on('data', (data: Buffer) => {
        // The C server responds with a GAME_INIT message.
        // Header: 1 byte version, 1 byte type, 2 bytes length.
        // Body: 2 bytes p1_port, 2 bytes p2_port. Total message size is 8 bytes.
        if (data.length >= 8 && data.readUInt8(1) === 0 && data.readUInt16BE(2) === 4) {
          // **THE FIX IS HERE:**
          // Correctly read the port numbers from the binary buffer.
          // The body starts at offset 4. Each port is a Big Endian unsigned 16-bit integer.
          const player1TcpPort = data.readUInt16BE(4);
          const player2TcpPort = data.readUInt16BE(6);
          console.log(`Received ports from pong-server: P1=${player1TcpPort}, P2=${player2TcpPort}`);

          client.destroy();

          const gameId = gameIdCounter++;
          const wsPort1 = 4001 + (gameId * 2);
          const wsPort2 = 4002 + (gameId * 2);

          // Start a new WebSocket proxy for this specific game's ports
          startWsProxy(wsPort1, wsPort2, player1TcpPort, player2TcpPort);

          resolve(
            reply.send({
              wsUrls: [`ws://localhost:${wsPort1}`, `ws://localhost:${wsPort2}`],
              tcpPorts: { player1: player1TcpPort, player2: player2TcpPort },
            })
          );
        } else {
          console.error('Received malformed or unexpected message from pong-server.');
          client.destroy();
          reject(new Error('Malformed response from game server'));
        }
      });

      client.on('error', (err) => {
        console.error('Backend error connecting to pong-server:', err);
        reply.status(500).send({ error: 'Cannot connect to the game server' });
        reject(err);
      });

      client.on('close', () => {
        console.log('Initial connection to pong-server closed.');
      });
    });
  });
}