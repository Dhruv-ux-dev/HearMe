import {
  DemoCabinLink,
  MockSpeechRecognizer,
  PassengerSession,
  type Buzzer,
  type PersistedSession,
  type Speaker,
} from '@hearme/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * App-wide runtime: one passenger session for this phone.
 * All integrations are adapters; the ones marked MOCK are simulations.
 */
export const link = new DemoCabinLink('simulated'); // MOCK crew tablet + cabin network
export const session = new PassengerSession({ link, device: 'phone' });
export const speech = new MockSpeechRecognizer(); // MOCK speech recognition (records nothing)

/** On-device text-to-speech (expo-speech). Uses the phone's installed voices, which work offline on most devices. */
export const speaker: Speaker = {
  available: () => true,
  speak: (text, bcp47) => {
    Speech.stop();
    Speech.speak(text, { language: bcp47, rate: 0.9 });
  },
  stop: () => {
    Speech.stop();
  },
};

/** Haptic "buzz" (no-op on web). */
export const buzzer: Buzzer = {
  buzz: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
};

// ── Persistence (phone only — the seatback IFE never persists) ─────────────
const KEY = 'hearme.session.v1';

export async function loadSession(): Promise<'restored' | 'fresh' | 'corrupt'> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return 'fresh';
    const saved = JSON.parse(raw) as PersistedSession;
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.requests)) throw new Error('bad shape');
    session.hydrate(saved);
    return saved.profile ? 'restored' : 'fresh';
  } catch {
    await AsyncStorage.removeItem(KEY).catch(() => undefined);
    return 'corrupt';
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function startAutosave(): () => void {
  return session.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(session.snapshot())).catch(() => undefined);
    }, 300);
  });
}

export async function clearStoredSession(): Promise<void> {
  session.clear();
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
