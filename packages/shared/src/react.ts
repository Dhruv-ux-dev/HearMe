import { useSyncExternalStore } from 'react';
import type { PassengerSession, SessionState } from './session/session';

/** Subscribe a React component to the shared PassengerSession store. */
export function useSession<T>(session: PassengerSession, select: (s: SessionState) => T): T {
  return useSyncExternalStore(
    session.subscribe,
    () => select(session.getState()),
    () => select(session.getState()),
  );
}

/** Subscribe to any `{ getState, subscribe }`-shaped store (e.g. the simulated CrewTablet). */
export function useExternal<S>(store: { getState(): S; subscribe(l: (s: S) => void): () => void }): S {
  return useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => store.getState(),
  );
}
