import { FastifyInstance } from 'fastify';
import net from 'net';
import { startWsProxy } from '../wsProxy';

let wsProxyStarted = false;

/**
 * Routes liées aux matches, sous /api/users/:userId/matches
 */
export async function matchRoutes(fastify: FastifyInstance) {
  fastify.post('/start', async (request, reply) => {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.connect(4000, 'pong-server', () => {
        const PROTOCOL_VERSION = 0;
        const MESSAGE_CLIENT_START = 0;
        const startMsg = Buffer.alloc(4);
        startMsg.writeUInt8(PROTOCOL_VERSION, 0);
        startMsg.writeUInt8(MESSAGE_CLIENT_START, 1);
        startMsg.writeUInt16BE(0, 2);
        client.write(startMsg);
      });

      client.on('data', (data) => {
        if (data.length >= 7 && data.readUInt8(1) === 0 && data.readUInt8(2) === 4) {
          const player1TcpPort = data.readUInt16BE(3);
          const player2TcpPort = data.readUInt16BE(5);

          client.destroy();

          // Ports WS fixes pour la communication WS <-> TCP
          const wsPort1 = 4001;
          const wsPort2 = 4002;

          // Démarrer le proxy WS une seule fois (au premier appel)
          if (!wsProxyStarted) {
            startWsProxy(wsPort1, wsPort2, player1TcpPort, player2TcpPort);
            wsProxyStarted = true;
          }

          resolve(
            reply.send({
              wsUrls: [`ws://localhost:${wsPort1}`, `ws://localhost:${wsPort2}`],
              tcpPorts: { player1: player1TcpPort, player2: player2TcpPort },
            })
          );
        }
      });

      client.on('error', (err) => {
        reply.status(500).send({ error: 'Cannot connect to pong server' });
        reject(err);
      });
    });
  });
}
