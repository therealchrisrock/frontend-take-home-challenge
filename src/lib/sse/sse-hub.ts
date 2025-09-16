type Namespace = "notifications" | "messages" | "game" | string;

export type SSEEnvelope<T = unknown> = { type: string; data?: T };

type Controller = ReadableStreamDefaultController<Uint8Array>;

interface ConnectionMeta {
  userId?: string;
  tabId?: string;
  gameId?: string;
}

interface Connection {
  id: string;
  ns: Namespace;
  key: string;
  clientId: string;
  controller: Controller;
  lastSeen: number;
  meta?: ConnectionMeta;
}

interface HubOptions {
  heartbeatMs?: number; // not used to auto-send typed heartbeats; reserved
  connectionTimeoutMs?: number;
  cleanupIntervalMs?: number;
}

interface AddOptions {
  enforceSingleClient?: boolean;
}

export class SSEHub {
  private groups = new Map<string, Map<string, Connection>>();
  private cleanup?: NodeJS.Timeout;
  private readonly timeoutMs: number;
  private readonly cleanupEveryMs: number;

  constructor(opts: HubOptions = {}) {
    this.timeoutMs = opts.connectionTimeoutMs ?? 60000;
    this.cleanupEveryMs =
      opts.cleanupIntervalMs ?? Math.min(this.timeoutMs, 30000);

    this.cleanup = setInterval(() => this.cleanupStale(), this.cleanupEveryMs);
  }

  addConnection(
    ns: Namespace,
    key: string,
    clientId: string,
    controller: Controller,
    meta?: ConnectionMeta,
    options: AddOptions = {},
  ): string {
    const groupKey = this.groupKey(ns, key);
    if (!this.groups.has(groupKey)) this.groups.set(groupKey, new Map());
    const group = this.groups.get(groupKey)!;

    if (options.enforceSingleClient) {
      // Remove all other clients for this group
      [...group.values()].forEach((conn) => {
        if (conn.clientId !== clientId) {
          // Best-effort close event; consumers may ignore
          this.safeSend(conn, {
            type: "connection_closed",
            data: { timestamp: Date.now() },
          });
          group.delete(conn.clientId);
        }
      });
    }

    const id = `${groupKey}:${clientId}:${Date.now()}`;
    const conn: Connection = {
      id,
      ns,
      key,
      clientId,
      controller,
      lastSeen: Date.now(),
      meta,
    };
    group.set(clientId, conn);

    return id;
  }

  sendTo<T = unknown>(
    ns: Namespace,
    key: string,
    clientId: string,
    message: SSEEnvelope<T>,
  ): void {
    const group = this.groups.get(this.groupKey(ns, key));
    const conn = group?.get(clientId);
    if (!conn) return;
    this.safeSend(conn, message);
  }

  touch(ns: Namespace, key: string, clientId: string): void {
    const group = this.groups.get(this.groupKey(ns, key));
    const conn = group?.get(clientId);
    if (!conn) return;
    conn.lastSeen = Date.now();
  }

  removeConnection(ns: Namespace, key: string, clientId: string): void {
    const group = this.groups.get(this.groupKey(ns, key));
    if (!group) return;
    group.delete(clientId);
    if (group.size === 0) this.groups.delete(this.groupKey(ns, key));
  }

  broadcast<T>(ns: Namespace, key: string, message: SSEEnvelope<T>): void {
    const group = this.groups.get(this.groupKey(ns, key));
    if (!group) return;
    group.forEach((conn) => this.safeSend(conn, message));
  }

  broadcastMany<T>(
    ns: Namespace,
    keys: string[],
    message: SSEEnvelope<T>,
  ): void {
    const seen = new Set<string>();
    keys.forEach((k) => {
      const gk = this.groupKey(ns, k);
      if (seen.has(gk)) return;
      seen.add(gk);
      const group = this.groups.get(gk);
      group?.forEach((conn) => this.safeSend(conn, message));
    });
  }

  forEachConnection(ns: Namespace, cb: (conn: Connection) => void): void {
    this.groups.forEach((group, groupKey) => {
      if (!groupKey.startsWith(`${ns}:`)) return;
      group.forEach((conn) => cb(conn));
    });
  }

  getStats(): {
    totalGroups: number;
    totalConnections: number;
    details: Array<{ groupKey: string; connectionCount: number }>;
  } {
    const details = Array.from(this.groups.entries()).map(([gk, group]) => ({
      groupKey: gk,
      connectionCount: group.size,
    }));
    return {
      totalGroups: this.groups.size,
      totalConnections: details.reduce((s, d) => s + d.connectionCount, 0),
      details,
    };
  }

  destroy(): void {
    if (this.cleanup) clearInterval(this.cleanup);
    this.groups.forEach((group) => {
      group.forEach((conn) => {
        this.safeSend(conn, {
          type: "connection_closed",
          data: { timestamp: Date.now() },
        });
      });
    });
    this.groups.clear();
  }

  private safeSend(conn: Connection, message: SSEEnvelope): void {
    try {
      const encoder = new TextEncoder();
      const data = `data: ${JSON.stringify(message)}\n\n`;
      conn.controller.enqueue(encoder.encode(data));
      conn.lastSeen = Date.now();
    } catch (_) {
      this.removeConnection(conn.ns, conn.key, conn.clientId);
    }
  }

  private cleanupStale(): void {
    const now = Date.now();
    this.groups.forEach((group, gk) => {
      group.forEach((conn, clientId) => {
        if (now - conn.lastSeen > this.timeoutMs) {
          group.delete(clientId);
        }
      });
      if (group.size === 0) this.groups.delete(gk);
    });
  }

  private groupKey(ns: Namespace, key: string): string {
    return `${ns}:${key}`;
  }
}

export const sseHub = new SSEHub();

process.on("exit", () => sseHub.destroy());
process.on("SIGINT", () => {
  sseHub.destroy();
  process.exit(0);
});
process.on("SIGTERM", () => {
  sseHub.destroy();
  process.exit(0);
});
