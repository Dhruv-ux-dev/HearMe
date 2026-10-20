import { decide, defaultMatcher, translator, type LangCode, type RequestSource } from '@hearme/shared';
import { Mic, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useNav } from '../nav';
import { speech } from '../runtime';
import { useTheme } from '../theme';
import { T } from './ui';

type Phase = 'idle' | 'listening' | 'processing';

const MIN_HOLD_MS = 400;

/** Route a transcript through the shared matcher: confident → review; unsure → "Did you mean?" pictures. */
export function useRouteTranscript() {
  const nav = useNav();
  return (transcript: string, source: RequestSource) => {
    const d = decide(defaultMatcher.match(transcript));
    if (d.kind === 'confident') nav.open({ kind: 'review', needId: d.needId, purposeId: d.purposeId, source });
    else nav.open({ kind: 'ask', options: d.options, purposeId: d.purposeId, source, transcript });
  };
}

/**
 * Hold-to-speak. Press and hold, speak, release. A short tap keeps listening
 * until a second tap (easier for people who cannot hold a button), and with a
 * screen reader one tap starts and the next stops. Speech recognition is
 * SIMULATED (MockSpeechRecognizer): no microphone access, nothing is recorded.
 */
export function HoldToSpeak({ lang }: { lang: LangCode }) {
  const th = useTheme();
  const tr = translator(lang);
  const route = useRouteTranscript();
  const [phase, setPhaseState] = useState<Phase>('idle');
  // Press handlers can be captured at press start, so read the live phase from a ref.
  const phaseRef = useRef<Phase>('idle');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [db, setDb] = useState(0);
  const [tapMode, setTapMode] = useState(false);
  const startedAt = useRef(0);
  /** True while a pointer gesture is in progress; activations without one come from screen readers or keyboards. */
  const viaPointer = useRef(false);

  useEffect(() => () => speech.cancel(), []);

  const start = () => {
    if (phaseRef.current !== 'idle') return;
    setTapMode(false);
    startedAt.current = Date.now();
    setPhase('listening');
    speech.start(lang, setDb);
    AccessibilityInfo.announceForAccessibility(tr('speech.listening'));
  };

  const finish = async () => {
    if (phaseRef.current !== 'listening') return;
    viaPointer.current = false;
    setPhase('processing');
    try {
      const { transcript } = await speech.stop();
      setPhase('idle');
      route(transcript, 'speech');
    } catch {
      setPhase('idle');
    }
  };

  /** Pointer released: a real hold finishes; a quick tap switches to tap-to-finish. */
  const release = () => {
    if (phaseRef.current !== 'listening') return;
    if (Date.now() - startedAt.current < MIN_HOLD_MS) setTapMode(true);
    else finish();
  };

  /** Pointer down: starts listening, or finishes when already listening in tap mode. */
  const pressIn = () => {
    viaPointer.current = true;
    if (phaseRef.current === 'listening') finish();
    else start();
  };

  /** Activation without a pointer (VoiceOver/TalkBack double-tap, keyboard): toggle. */
  const activate = () => {
    if (viaPointer.current) {
      viaPointer.current = false;
      return;
    }
    if (phaseRef.current === 'idle') {
      start();
      setTapMode(true);
    } else finish();
  };

  // On web the release can be missed when the DOM updates under the pointer, so also listen on the window.
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'listening' || tapMode) return;
    const w = globalThis as unknown as { addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void };
    w.addEventListener('pointerup', release);
    w.addEventListener('touchend', release);
    return () => {
      w.removeEventListener('pointerup', release);
      w.removeEventListener('touchend', release);
    };
  });

  const bars = Array.from({ length: 14 }, (_, i) => {
    const level = Math.max(0.15, Math.min(1, ((db - 70) / 18) * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + db)))));
    return level;
  });

  return (
    <View style={{ gap: th.space.sm }}>
      {phase !== 'idle' && (
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={phase === 'listening' ? tr('speech.listening') : tr('speech.processing')}
          style={{ backgroundColor: th.p.surface, borderRadius: th.radius.md, borderWidth: 2, borderColor: th.p.primary, padding: th.space.md, gap: th.space.sm }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {phase === 'processing' ? <ActivityIndicator color={th.p.primary} /> : <Mic color={th.p.primary} size={20} />}
              <T bold>{phase === 'listening' ? tr('speech.listening') : tr('speech.processing')}</T>
            </View>
            {phase === 'listening' && (
              <View style={{ backgroundColor: th.p.warningSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: th.p.warning, fontWeight: '700', fontSize: th.fs(13) }}>{db} dB</Text>
              </View>
            )}
          </View>
          {phase === 'listening' && !th.reduceMotion && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36 }} importantForAccessibility="no-hide-descendants">
              {bars.map((b, i) => (
                <View key={i} style={{ flex: 1, height: `${Math.round(b * 100)}%`, backgroundColor: th.p.primary, borderRadius: 3 }} />
              ))}
            </View>
          )}
          <T v="caption" muted>
            {tr('speech.simulated')}
          </T>
        </View>
      )}
      <Pressable
        onPressIn={pressIn}
        onPressOut={release}
        onPress={activate}
        disabled={phase === 'processing'}
        accessibilityRole="button"
        accessibilityLabel={phase === 'listening' ? tr('speech.tapToFinish') : tr('home.holdToSpeak')}
        accessibilityState={{ busy: phase === 'processing', selected: phase === 'listening' }}
        style={({ pressed }) => ({
          minHeight: 64,
          borderRadius: th.radius.md,
          backgroundColor: phase === 'listening' ? th.p.navy : th.p.primary,
          borderWidth: th.hc ? 2 : 0,
          borderColor: th.p.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: th.space.sm,
          opacity: pressed && phase === 'idle' ? 0.9 : 1,
        })}
      >
        {phase === 'listening' ? <Square color={th.p.onNavy} size={th.fs(22)} /> : <Mic color={th.p.onPrimary} size={th.fs(26)} />}
        <Text maxFontSizeMultiplier={1.4} style={{ color: phase === 'listening' ? th.p.onNavy : th.p.onPrimary, fontSize: th.fs(th.t.bodyLarge), fontWeight: '800' }}>
          {phase === 'listening' ? (tapMode ? tr('speech.tapToFinish') : tr('speech.listening')) : tr('home.holdToSpeak')}
        </Text>
      </Pressable>
    </View>
  );
}
