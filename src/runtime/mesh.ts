import { EventEmitter } from "node:events";
import { connect, type NatsConnection, StringCodec } from "nats";

export type MeshKind = "nats" | "local";
export type MeshHandler = (payload: string, subject: string) => void | Promise<void>;

export interface MeshBus {
  readonly kind: MeshKind;
  publish(subject: string, payload: string): Promise<void>;
  subscribe(subject: string, handler: MeshHandler): Promise<() => Promise<void>>;
  close(): Promise<void>;
}

function matchesSubject(pattern: string, subject: string): boolean {
  const patternParts = pattern.split(".");
  const subjectParts = subject.split(".");

  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    if (part === ">") {
      return true;
    }
    if (part !== "*" && part !== subjectParts[i]) {
      return false;
    }
  }

  return patternParts.length === subjectParts.length;
}

export class LocalMeshBus implements MeshBus {
  readonly kind = "local" as const;
  private readonly bus = new EventEmitter();
  private readonly subscriptions = new Map<string, Set<MeshHandler>>();

  async publish(subject: string, payload: string): Promise<void> {
    for (const [pattern, handlers] of this.subscriptions.entries()) {
      if (matchesSubject(pattern, subject)) {
        for (const handler of handlers) {
          queueMicrotask(() => void handler(payload, subject));
        }
      }
    }
    this.bus.emit(subject, payload);
  }

  async subscribe(subject: string, handler: MeshHandler): Promise<() => Promise<void>> {
    const handlers = this.subscriptions.get(subject) ?? new Set<MeshHandler>();
    handlers.add(handler);
    this.subscriptions.set(subject, handlers);

    return async () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(subject);
      }
    };
  }

  async close(): Promise<void> {
    this.subscriptions.clear();
    this.bus.removeAllListeners();
  }
}

export class NatsMeshBus implements MeshBus {
  readonly kind = "nats" as const;
  private readonly codec = StringCodec();

  constructor(private readonly nc: NatsConnection) {}

  async publish(subject: string, payload: string): Promise<void> {
    this.nc.publish(subject, this.codec.encode(payload));
  }

  async subscribe(subject: string, handler: MeshHandler): Promise<() => Promise<void>> {
    const subscription = this.nc.subscribe(subject);
    let active = true;

    void (async () => {
      for await (const message of subscription) {
        if (!active) {
          break;
        }
        await handler(this.codec.decode(message.data), message.subject);
      }
    })();

    return async () => {
      active = false;
      subscription.unsubscribe();
    };
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }
}

export async function createMeshBus(url = process.env.NATS_URL): Promise<MeshBus> {
  if (!url) {
    return new LocalMeshBus();
  }

  try {
    const nc = await connect({ servers: url, timeout: 1_000 });
    return new NatsMeshBus(nc);
  } catch {
    return new LocalMeshBus();
  }
}

