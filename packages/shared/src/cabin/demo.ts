import type { LinkStatus } from '../types';
import { createBroadcastBus, LocalHub, type CabinBus } from './bus';
import { CrewTablet } from './crewTablet';
import { SimulatedCabinLink, type CabinLink, type NetworkCondition } from './link';
import type { CrewToPassenger, PassengerToCrew } from './protocol';

/**
 * Prototype wiring: a `CabinLink` whose far end is either
 *  - 'simulated': an auto-replying CrewTablet running inside this app, or
 *  - 'console':   the Crew console page in another tab (BroadcastChannel; web only).
 * Both are MOCKS of the real crew tablet. The demo controls let a presenter
 * switch mode and simulate good / unstable / no connection.
 */
export type CrewMode = 'simulated' | 'console';

export class DemoCabinLink implements CabinLink {
  readonly simulated = true;
  private inner!: SimulatedCabinLink;
  private bus!: CabinBus;
  private crewBus?: CabinBus;
  private crew: CrewTablet | null = null;
  private innerUnsubs: (() => void)[] = [];
  private statusListeners = new Set<(s: LinkStatus) => void>();
  private messageListeners = new Set<(m: CrewToPassenger) => void>();
  private condition: NetworkCondition = 'good';
  private modeValue: CrewMode = 'simulated';
  private changeListeners = new Set<() => void>();

  constructor(mode: CrewMode = 'simulated') {
    this.build(mode);
  }

  get mode(): CrewMode {
    return this.modeValue;
  }

  get networkCondition(): NetworkCondition {
    return this.condition;
  }

  /** True when this runtime can reach a crew console tab (BroadcastChannel available). */
  static consoleSupported(): boolean {
    return typeof (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel === 'function';
  }

  /** The in-app simulated crew tablet (only in 'simulated' mode). */
  get simulatedCrew(): CrewTablet | null {
    return this.crew;
  }

  setMode(mode: CrewMode): void {
    if (mode === this.modeValue) return;
    this.teardown();
    this.build(mode);
    this.emitStatus();
    this.changeListeners.forEach((l) => l());
  }

  setCondition(condition: NetworkCondition): void {
    this.condition = condition;
    this.inner.setCondition(condition);
    this.changeListeners.forEach((l) => l());
  }

  /** Notified when mode or condition changes (for demo-control UIs). */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  getStatus(): LinkStatus {
    return this.inner.getStatus();
  }

  onStatus(listener: (s: LinkStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onMessage(listener: (m: CrewToPassenger) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  send(message: PassengerToCrew): boolean {
    return this.inner.send(message);
  }

  dispose(): void {
    this.teardown();
    this.statusListeners.clear();
    this.messageListeners.clear();
    this.changeListeners.clear();
  }

  private build(mode: CrewMode): void {
    const broadcast = mode === 'console' ? createBroadcastBus() : null;
    if (broadcast) {
      this.modeValue = 'console';
      this.bus = broadcast;
    } else {
      this.modeValue = 'simulated';
      const hub = new LocalHub();
      this.bus = hub.connect();
      this.crewBus = hub.connect();
      this.crew = new CrewTablet(this.crewBus, { autoReply: true });
    }
    this.inner = new SimulatedCabinLink(this.bus, { condition: this.condition });
    this.innerUnsubs = [
      this.inner.onStatus(() => this.emitStatus()),
      this.inner.onMessage((m) => this.messageListeners.forEach((l) => l(m))),
    ];
  }

  private emitStatus(): void {
    const s = this.inner.getStatus();
    this.statusListeners.forEach((l) => l(s));
  }

  private teardown(): void {
    this.innerUnsubs.forEach((u) => u());
    this.inner.dispose();
    this.bus.close();
    this.crew?.dispose();
    this.crewBus?.close();
    this.crew = null;
    this.crewBus = undefined;
  }
}
