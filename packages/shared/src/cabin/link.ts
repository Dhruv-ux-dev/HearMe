import type { LinkStatus } from '../types';
import type { CabinBus } from './bus';
import type { CrewToPassenger, PassengerToCrew } from './protocol';
import { isCrewMessage } from './protocol';

/**
 * Passenger-side connection to the crew tablet.
 *
 * Adapter boundary: the app only talks to `CabinLink`. The production
 * implementation would be a WebSocket client to the crew tablet's local
 * server; this prototype provides `SimulatedCabinLink`, which runs over a
 * `CabinBus` and can simulate a good, unstable or missing connection.
 */
export interface CabinLink {
  readonly simulated: boolean;
  getStatus(): LinkStatus;
  onStatus(listener: (status: LinkStatus) => void): () => void;
  /** Returns false when the message could not leave the device (offline). Returning true is NOT delivery confirmation. */
  send(message: PassengerToCrew): boolean;
  onMessage(listener: (message: CrewToPassenger) => void): () => void;
  dispose(): void;
}

export type NetworkCondition = 'good' | 'unstable' | 'offline';

export interface SimulatedLinkOptions {
  condition?: NetworkCondition;
  /** Probability a message is lost when the condition is 'unstable'. */
  lossRate?: number;
  /** The crew tablet is considered unreachable if no heartbeat arrives within this window. */
  heartbeatTimeoutMs?: number;
  random?: () => number;
  now?: () => number;
}

export class SimulatedCabinLink implements CabinLink {
  readonly simulated = true;
  private condition: NetworkCondition;
  private status: LinkStatus;
  private lastHeartbeat = -Infinity;
  private statusListeners = new Set<(s: LinkStatus) => void>();
  private messageListeners = new Set<(m: CrewToPassenger) => void>();
  private unsubscribeBus: () => void;
  private timer: ReturnType<typeof setInterval>;
  private readonly lossRate: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly random: () => number;
  private readonly now: () => number;

  constructor(
    private bus: CabinBus,
    options: SimulatedLinkOptions = {},
  ) {
    this.condition = options.condition ?? 'good';
    this.lossRate = options.lossRate ?? 0.5;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 6000;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.status = this.computeStatus();
    this.unsubscribeBus = bus.subscribe((m) => this.receive(m));
    this.timer = setInterval(() => this.refreshStatus(), 1000);
  }

  get networkCondition(): NetworkCondition {
    return this.condition;
  }

  setCondition(condition: NetworkCondition): void {
    this.condition = condition;
    this.refreshStatus();
  }

  getStatus(): LinkStatus {
    return this.status;
  }

  onStatus(listener: (status: LinkStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onMessage(listener: (message: CrewToPassenger) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  send(message: PassengerToCrew): boolean {
    if (this.condition === 'offline') return false;
    if (this.dropped()) return true; // it left the device but was lost on the way
    this.bus.post(message);
    return true;
  }

  dispose(): void {
    clearInterval(this.timer);
    this.unsubscribeBus();
    this.statusListeners.clear();
    this.messageListeners.clear();
  }

  private dropped(): boolean {
    return this.condition === 'unstable' && this.random() < this.lossRate;
  }

  private receive(m: Parameters<Parameters<CabinBus['subscribe']>[0]>[0]): void {
    if (!isCrewMessage(m) || this.condition === 'offline') return;
    if (m.type === 'crew.heartbeat') {
      // Heartbeats are small and frequent; we don't drop them so the status pill stays readable.
      this.lastHeartbeat = this.now();
      this.refreshStatus();
      return;
    }
    if (this.dropped()) return;
    this.messageListeners.forEach((l) => l(m));
  }

  private computeStatus(): LinkStatus {
    if (this.condition === 'offline') return 'offline';
    return this.now() - this.lastHeartbeat <= this.heartbeatTimeoutMs ? 'online' : 'no_crew';
  }

  private refreshStatus(): void {
    const next = this.computeStatus();
    if (next !== this.status) {
      this.status = next;
      this.statusListeners.forEach((l) => l(next));
    }
  }
}
