import { Server, WebSocket } from 'ws';
import net from 'net';

type WsData = string | Buffer | ArrayBuffer;

// Helper to safely send data over WebSocket, handling both Buffer and ArrayBuffer
function sendWsSafe(wsClient: WebSocket, data: Buffer | ArrayBuffer) {
  if (data instanceof Buffer) {
    wsClient.send(data);
  } else {
    wsClient.send(Buffer.from(new Uint8Array(data)));
  }
}

// Start a WebSocket to TCP proxy for two players
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
		const code = (err as NodeJS.ErrnoException).code;
		if (code === 'ECONNRESET' || code === 'EPIPE') {
			// Fermeture normale par le serveur → log seulement
			console.log(`Pong socket closed by server (${player})`);
		} else {
			// Autres erreurs inattendues
			console.error(`Unexpected Pong socket error (${player}):`, err);
		}
		wsClient.close();
	});

  };

  wss1.on('connection', (ws) => setupProxy(ws, tcpPort1, 'player 1'));
  wss2.on('connection', (ws) => setupProxy(ws, tcpPort2, 'player 2'));

  console.log(`WS proxy listening: ws://localhost:${wsPort1} -> tcp://${tcpHost}:${tcpPort1}`);
  console.log(`WS proxy listening: ws://localhost:${wsPort2} -> tcp://${tcpHost}:${tcpPort2}`);
}