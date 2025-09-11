type GameId = string;

interface GameConnection {
  id: string;
  gameId: GameId;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastSeen: Date;
}

interface SSEEnvelope<T = unknown> {
  type: string;
  data: T;
}

export class GameConnectionManager {
  private games = new Map<GameId, Map<string, GameConnection>>();
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_MS = 30000;

  constructor() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcastAll({ type: "heartbeat", data: { timestamp: Date.now() } });
    }, this.HEARTBEAT_MS);
  }

  addConnection(
    gameId: GameId,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): string {
    const id = `${gameId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (!this.games.has(gameId)) this.games.set(gameId, new Map());
    this.games.get(gameId)!.set(id, {
      id,
      gameId,
      controller,
      lastSeen: new Date(),
    });

    // Send connection established
    this.send(gameId, id, {
      type: "connection_established",
      data: { connectionId: id, timestamp: Date.now() },
    });

    return id;
  }

  removeConnection(gameId: GameId, connectionId: string): void {
    const group = this.games.get(gameId);
    if (!group) return;
    group.delete(connectionId);
    if (group.size === 0) this.games.delete(gameId);
  }

  broadcast<T = unknown>(gameId: GameId, message: SSEEnvelope<T>): void {
    const group = this.games.get(gameId);
    if (!group) return;
    group.forEach((conn) => this.sendEnvelope(conn, message));
  }

  private broadcastAll<T = unknown>(message: SSEEnvelope<T>): void {
    this.games.forEach((group) => {
      group.forEach((conn) => this.sendEnvelope(conn, message));
    });
  }

  private send(
    gameId: GameId,
    connectionId: string,
    message: SSEEnvelope,
  ): void {
    const group = this.games.get(gameId);
    const conn = group?.get(connectionId);
    if (!conn) return;
    this.sendEnvelope(conn, message);
  }

  private sendEnvelope(conn: GameConnection, message: SSEEnvelope): void {
    try {
      const encoder = new TextEncoder();
      const data = `data: ${JSON.stringify(message)}\n\n`;
      conn.controller.enqueue(encoder.encode(data));
      conn.lastSeen = new Date();
    } catch (err) {
      // Drop broken connection
      this.removeConnection(conn.gameId, conn.id);
    }
  }

  destroy(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.games.clear();
  }
}

export const gameConnectionManager = new GameConnectionManager();
