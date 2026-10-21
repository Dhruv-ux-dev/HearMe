/**
 * How far does meaning-matching reach beyond the 6 catalogue languages?
 * Typed requests in Bengali, Tamil and Tagalog, for which HearMe has no
 * vocabulary, translations or training data at all: only multilingual-e5
 * (which saw ~100 languages in pre-training) and the trained head.
 *
 *   npm run zeroshot -w @hearme/hub
 *
 * Phrasings are our own drafts, not native-checked.
 */
import { CONFIDENCE_THRESHOLD, SemanticNeedMatcher, createKeywordMatcher, type MatchResult } from '@hearme/shared';
import { createE5 } from '../ai';
import { loadNeedHead } from '../head';
import { inferenceThreads } from '../models';

const PHRASES: Record<string, Record<string, string>> = {
  'Bengali (bn)': {
    water: 'এক গ্লাস জল দিন',
    hot_water: 'ওষুধ খাওয়ার জন্য একটু গরম জল দিন',
    tea: 'এক কাপ চা পাওয়া যাবে?',
    blanket: 'খুব ঠান্ডা লাগছে, একটা কম্বল দিন',
    meal: 'খাবার কখন দেওয়া হবে?',
    toilet: 'বাথরুম কোথায়?',
    medicine: 'আমার ওষুধ লাগবে',
    unwell: 'আমার শরীর ভালো লাগছে না',
    too_cold: 'আমার খুব শীত করছে',
    wheelchair_arrival: 'নামার সময় আমার হুইলচেয়ার লাগবে',
    charger: 'আমার ফোন চার্জ করতে হবে',
    sick_bag: 'আমার বমি পাচ্ছে',
  },
  'Tamil (ta)': {
    water: 'கொஞ்சம் தண்ணீர் தாருங்கள்',
    hot_water: 'மாத்திரை சாப்பிட சுடு தண்ணீர் வேண்டும்',
    tea: 'ஒரு டீ கிடைக்குமா?',
    blanket: 'ரொம்ப குளிருது, ஒரு போர்வை வேண்டும்',
    meal: 'சாப்பாடு எப்போது வரும்?',
    toilet: 'கழிவறை எங்கே இருக்கிறது?',
    medicine: 'எனக்கு மருந்து வேண்டும்',
    unwell: 'எனக்கு உடம்பு சரியில்லை',
    too_cold: 'எனக்கு மிகவும் குளிராக இருக்கிறது',
    wheelchair_arrival: 'இறங்கும்போது எனக்கு சக்கர நாற்காலி வேண்டும்',
    charger: 'என் போனை சார்ஜ் செய்ய வேண்டும்',
    sick_bag: 'எனக்கு வாந்தி வருகிறது',
  },
  'Tagalog (tl)': {
    water: 'Pwede po bang humingi ng tubig?',
    hot_water: 'Kailangan ko ng mainit na tubig para sa gamot ko',
    tea: 'May tsaa po ba kayo?',
    blanket: 'Ang lamig po, pwede po ba ng kumot?',
    meal: 'Kailan po ang pagkain?',
    toilet: 'Saan po ang banyo?',
    medicine: 'Kailangan ko po ng gamot',
    unwell: 'Masama po ang pakiramdam ko',
    too_cold: 'Nilalamig po ako',
    wheelchair_arrival: 'Kailangan ko po ng wheelchair pagbaba',
    charger: 'Kailangan kong i-charge ang cellphone ko',
    sick_bag: 'Nasusuka po ako',
  },
};

function score(results: { expected: string; m: MatchResult }[]) {
  const pct = (n: number) => `${Math.round((100 * n) / results.length)}%`;
  const sent = results.filter((r) => r.m.confidence >= CONFIDENCE_THRESHOLD);
  return {
    top1: pct(results.filter((r) => r.m.candidates[0]?.needId === r.expected).length),
    top3: pct(results.filter((r) => r.m.candidates.slice(0, 3).some((c) => c.needId === r.expected)).length),
    sentWithoutAsking: pct(sent.length),
    wrongButConfident: pct(sent.filter((r) => r.m.candidates[0]?.needId !== r.expected).length),
  };
}

const e5 = await createE5(inferenceThreads());
const keyword = createKeywordMatcher();
const plain = await SemanticNeedMatcher.create(e5);
const head = loadNeedHead();
const trained = await SemanticNeedMatcher.create(e5, undefined, head);
const table: Record<string, Record<string, string>> = {};
for (const [lang, phrases] of Object.entries(PHRASES)) {
  const items = Object.entries(phrases).map(([expected, text]) => ({ expected, text }));
  const run = async (match: (t: string) => MatchResult | Promise<MatchResult>) => {
    const out: { expected: string; m: MatchResult }[] = [];
    for (const i of items) out.push({ expected: i.expected, m: await match(i.text) }); // one at a time: one ONNX session
    return score(out);
  };
  const k = await run((t) => keyword.match(t));
  const p = await run((t) => plain.match(t));
  const h = head ? await run((t) => trained.match(t)) : null;
  table[`${lang} · keywords`] = k;
  table[`${lang} · + e5`] = p;
  if (h) table[`${lang} · + e5 + head`] = h;
}
console.log('\n▶ Zero-shot languages (no HearMe vocabulary), 12 typed requests each');
console.table(table);
