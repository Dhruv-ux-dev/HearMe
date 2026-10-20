import {
  LANGUAGES,
  PROFILE_TAGS,
  isValidSeat,
  mockBooking,
  normalizeSeat,
  sanitizeName,
  simulateSeatQrScan,
  translator,
  type LangCode,
  type ProfileTag,
} from '@hearme/shared';
import { Check, ChevronLeft, ScanQrCode, Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, T, ToggleRow } from '../components/ui';
import { session } from '../runtime';
import { useTheme } from '../theme';

type Step = 'language' | 'seat' | 'needs';

/** Three short steps: language → seat → optional needs. Or one tap with (simulated) booking data. */
export function Onboarding() {
  const th = useTheme();
  const [step, setStep] = useState<Step>('language');
  const [lang, setLang] = useState<LangCode>('en');
  const [seat, setSeat] = useState('');
  const [seatError, setSeatError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [booking, setBooking] = useState<'idle' | 'loading' | 'error'>('idle');
  const [name, setName] = useState('');
  const [tags, setTags] = useState<ProfileTag[]>([]);
  const [share, setShare] = useState(true);
  const tr = translator(lang);

  const useBooking = async () => {
    setBooking('loading');
    try {
      session.setProfile(await mockBooking.lookup());
    } catch {
      setBooking('error');
    }
  };

  const confirmSeat = () => {
    if (!isValidSeat(seat)) {
      setSeatError(true);
      return;
    }
    setSeat(normalizeSeat(seat));
    setStep('needs');
  };

  const scan = async () => {
    setScanning(true);
    const s = await simulateSeatQrScan();
    setScanning(false);
    setSeat(s);
    setSeatError(false);
  };

  const finish = () => {
    const clean = sanitizeName(name);
    session.setProfile({ lang, seat: normalizeSeat(seat), name: clean || undefined, tags, shareTagsWithCrew: share });
  };

  const back = (to: Step) => (
    <Pressable
      onPress={() => setStep(to)}
      accessibilityRole="button"
      accessibilityLabel={tr('common.back')}
      style={{ minHeight: th.minTouch, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
    >
      <ChevronLeft color={th.p.text} size={24} />
      <T bold>{tr('common.back')}</T>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.p.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: th.space.xl, gap: th.space.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {step === 'language' && (
            <>
              <View style={{ gap: th.space.xs, marginTop: th.space.lg }}>
                <Text accessibilityRole="header" style={{ fontSize: th.fs(44), fontWeight: '800', color: th.p.navy === '#000000' ? th.p.text : th.p.navy }}>
                  Hear<Text style={{ color: th.p.primary }}>Me</Text>
                </Text>
                <T muted>{translator('en')('app.tagline')}</T>
              </View>
              <View accessible accessibilityRole="header">
                {LANGUAGES.map((l) => (
                  <T key={l.code} v={l.code === 'hi' ? 'title' : 'bodyLarge'} bold lang={l.bcp47}>
                    {translator(l.code)('onboard.chooseLanguage')}
                  </T>
                ))}
              </View>
              <View accessibilityRole="radiogroup" style={{ gap: th.space.sm }}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      setLang(l.code);
                      setStep('seat');
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: lang === l.code }}
                    accessibilityLabel={`${l.nativeName}, ${l.englishName}`}
                    accessibilityLanguage={l.bcp47}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      borderRadius: th.radius.md,
                      borderWidth: 2,
                      borderColor: pressed ? th.p.primary : th.p.border,
                      backgroundColor: pressed ? th.p.primarySoft : th.p.surface,
                      paddingHorizontal: th.space.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    })}
                  >
                    <T v="title">{l.nativeName}</T>
                    <T muted>{l.englishName}</T>
                  </Pressable>
                ))}
              </View>
              <View style={{ gap: th.space.sm, marginTop: th.space.md }}>
                <Btn
                  variant="ghost"
                  label={booking === 'loading' ? '…' : translator('en')('onboard.useBooking')}
                  disabled={booking === 'loading'}
                  onPress={useBooking}
                  icon={(c, s) => (booking === 'loading' ? <ActivityIndicator color={c} /> : <Ticket color={c} size={s} />)}
                  hint="Loads the example passenger from the PDF: Hindi, seat 23C, senior, hard of hearing."
                />
                {booking === 'error' && (
                  <T color={th.p.danger} role="alert">
                    Booking details could not be loaded. Please choose your language above.
                  </T>
                )}
              </View>
            </>
          )}

          {step === 'seat' && (
            <>
              {back('language')}
              <T v="heading" role="header">
                {tr('onboard.seatTitle')}
              </T>
              <T muted>{tr('onboard.seatHint')}</T>
              <Btn
                variant="secondary"
                big
                label={scanning ? '…' : tr('onboard.scanQr')}
                onPress={scan}
                disabled={scanning}
                icon={(c, s) => (scanning ? <ActivityIndicator color={c} /> : <ScanQrCode color={c} size={s} />)}
              />
              <View style={{ gap: th.space.xs }}>
                <Text nativeID="seatLabel" style={{ color: th.p.text, fontSize: th.fs(th.t.body), fontWeight: '700' }}>
                  {tr('common.seat')}
                </Text>
                <TextInput
                  value={seat}
                  onChangeText={(v) => {
                    setSeat(v.toUpperCase());
                    setSeatError(false);
                  }}
                  onSubmitEditing={confirmSeat}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={4}
                  placeholder="23C"
                  placeholderTextColor={th.p.textMuted}
                  accessibilityLabel={tr('common.seat')}
                  accessibilityLabelledBy="seatLabel"
                  accessibilityHint={tr('onboard.seatInvalid')}
                  style={{
                    minHeight: 64,
                    borderWidth: 2,
                    borderColor: seatError ? th.p.danger : th.p.border,
                    borderRadius: th.radius.md,
                    paddingHorizontal: th.space.lg,
                    fontSize: th.fs(28),
                    fontWeight: '700',
                    color: th.p.text,
                    backgroundColor: th.p.surface,
                  }}
                />
                {seatError && (
                  <T color={th.p.danger} role="alert" live="assertive">
                    {tr('onboard.seatInvalid')}
                  </T>
                )}
              </View>
              <View style={{ flex: 1 }} />
              <Btn big label={tr('common.continue')} onPress={confirmSeat} disabled={!seat.trim()} />
            </>
          )}

          {step === 'needs' && (
            <>
              {back('seat')}
              <T v="heading" role="header">
                {tr('settings.needs')}
              </T>
              <T muted>{tr('onboard.needsHint')}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space.sm }}>
                {PROFILE_TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => setTags(on ? tags.filter((x) => x !== tag) : [...tags, tag])}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={{
                        minHeight: th.minTouch,
                        paddingHorizontal: th.space.lg,
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: on ? th.p.primary : th.p.border,
                        backgroundColor: on ? th.p.primarySoft : th.p.surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {on && <Check size={20} color={th.p.primary} />}
                      <T bold color={on ? th.p.primary : th.p.text}>
                        {tr(`tag.${tag}`)}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
              <ToggleRow label={tr('settings.share')} value={share} onChange={setShare} />
              <View style={{ gap: th.space.xs }}>
                <T bold>{tr('onboard.name')}</T>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={40}
                  accessibilityLabel={tr('onboard.name')}
                  accessibilityHint={tr('onboard.nameHint')}
                  style={{
                    minHeight: th.minTouch,
                    borderWidth: 2,
                    borderColor: th.p.border,
                    borderRadius: th.radius.md,
                    paddingHorizontal: th.space.lg,
                    fontSize: th.fs(th.t.bodyLarge),
                    color: th.p.text,
                    backgroundColor: th.p.surface,
                  }}
                />
                <T v="caption" muted>
                  {tr('onboard.nameHint')}
                </T>
              </View>
              <View style={{ flex: 1 }} />
              <Btn big label={tr('onboard.start')} onPress={finish} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
