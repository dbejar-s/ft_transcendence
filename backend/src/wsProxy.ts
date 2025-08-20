import { Server, WebSocket } from 'ws';
import net from 'net';

type WsData = string | Buffer | ArrayBuffer;

/**
 * Envoie les données au client WS en s'assurant que c'est un Buffer
 */
function sendWsSafe(wsClient: WebSocket, data: Buffer | ArrayBuffer) {
  if (data instanceof Buffer) {
    wsClient.send(data);
  } else {
    wsClient.send(Buffer.from(new Uint8Array(data)));
  }
}

/**
 * Lance un proxy WS -> TCP pour deux joueurs, en liant WS sur wsPortX au TCP pong-server tcpPortX
 */
export function startWsProxy(
  wsPort1: number,
  wsPort2: number,
  tcpPort1: number,
  tcpPort2: number,
  tcpHost = 'pong-server'
) {
  const wss1 = new Server({ port: wsPort1 });
  const wss2 = new Server({ port: wsPort2 });

  const setupProxy = (wsClient: WebSocket, tcpPort: number, player: string) => {
    const pongSocket = new net.Socket();
    pongSocket.connect(tcpPort, tcpHost, () => {
      console.log(`Connected to pong server for ${player} on TCP port ${tcpPort}`);
    });

    pongSocket.on('data', (data) => sendWsSafe(wsClient, data));

    wsClient.on('message', (msg: WsData) => {
      if (typeof msg === 'string') {
        pongSocket.write(msg);
      } else if (msg instanceof Buffer) {
        pongSocket.write(msg);
      } else if (msg instanceof ArrayBuffer) {
        pongSocket.write(Buffer.from(new Uint8Array(msg)));
      } else {
        console.error('Unsupported message type:', typeof msg);
      }
    });

    wsClient.on('close', () => pongSocket.end());
    pongSocket.on('close', () => wsClient.close());
    pongSocket.on('error', (err) => {
      console.error(`Pong socket error (${player}):`, err);
      wsClient.close();
    });
  };

  wss1.on('connection', (ws) => setupProxy(ws, tcpPort1, 'player 1'));
  wss2.on('connection', (ws) => setupProxy(ws, tcpPort2, 'player 2'));

  console.log(`WS proxy listening: ws://localhost:${wsPort1} -> tcp://${tcpHost}:${tcpPort1}`);
  console.log(`WS proxy listening: ws://localhost:${wsPort2} -> tcp://${tcpHost}:${tcpPort2}`);
}