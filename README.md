# HearMe — prototype

> Helping passengers and cabin crew understand each other. In any language. In a noisy cabin. Even with no internet.

A runnable prototype of the idea in *HearMe · Idea Submission* (Nidhish Bansal, Dhruv Mittal, Dibyanshu Samal). It has two passenger experiences that share one product core:

| Mode | Stack | Where |
| --- | --- | --- |
| **Mobile app** (portrait, phone) | Expo / React Native (Android, iOS, web) | `apps/mobile` |
| **IFE seatback screen** (landscape, shared device) | React + Vite (browser prototype) | `apps/ife` → `#/ife` |
| Crew console (**simulator**) | React + Vite | `apps/ife` → `#/crew` |
| Shared core: types, catalogue, translations, matcher, request state machine, adapters, design tokens | TypeScript | `packages/shared` |

> ⚠️ This is a browser and Expo prototype. It is **not** integrated with, or certified for, any aircraft IFE system, crew tablet or airline system. Every integration is behind an adapter, and the simulated ones are labelled in the UI.

## Screenshots

| IFE seatback | Mobile |
| --- | --- |
| [IFE 1/2](docs/screenshots/ife-1.png) · [IFE 2/2 + crew console](docs/screenshots/ife-2.png) | [Mobile 1/2](docs/screenshots/mobile-1.png) · [Mobile 2/2](docs/screenshots/mobile-2.png) |

---

## Quick start

Requires Node 20+ (tested on Node 22).

```bash
npm install
npm run build:mobile-web   # exports the Expo app to apps/ife/public/mobile (for the phone preview)
npm run dev                # http://localhost:5173 → mode selector
```

The mode selector at `http://localhost:5173/` opens:

- **Mobile app**: the Expo web build inside a phone frame (`#/mobile`)
- **IFE seatback screen**: `#/ife` (optional `?seat=24A`, `?idle=20` for a 20-second inactivity timeout in demos)
- **Crew console (simulator)**: `#/crew`, opens in a new tab

> Run `build:mobile-web` **before** `npm run dev`. If you re-export while Vite is running, restart Vite so it picks up the new files.

Run the mobile app natively:

```bash
npm run mobile        # Expo dev server; scan the QR code with Expo Go (Android/iOS)
npm run mobile:web    # Expo web dev server
```

Checks:

```bash
npm run typecheck     # shared, mobile, ife
npm test              # shared unit tests + IFE component tests
npm run build         # Expo web export + IFE production build (apps/ife/dist)
```

---

## What the PDF says (requirements)

**Problem.** Passengers who don't share a language with the crew struggle to be understood, especially in a loud cabin. The PDF gives 75–85 dB of cabin noise, and notes that over 1 in 4 people over 60 have disabling hearing loss. Signs and announcements are only in Japanese and English. The call button tells crew that someone needs help, not *what* they need.

**Example persona.** Sharda, 68, speaks only Hindi and is a little hard of hearing. She is flying Delhi → Tokyo and needs warm water for her tablets on time.

**Idea: "Tap it, say it, or point at it."**
1. The passenger taps a picture or speaks her language. Without a phone, she points at the printed card in the seat pocket.
2. The crew tablet shows "23C · hot water for medicine" in Japanese before anyone walks over.
3. The answer comes back in her language: on screen, as a picture, and as a voice in her earphones.

**The trick.** Don't translate every word. Match speech to one of about 64 common needs, which still works with strong accents and engine noise. If unsure (confidence below 85%), ask with pictures, and offer "None of these, call crew".

**Journey stages.** Check-in: language and needs saved once. Boarding: safety briefing in pictures. In the air: requests and announcement captions. Arrival: medical and wheelchair handover.

**Architecture and principles.** Everything runs inside the plane on cabin Wi‑Fi with no internet. The passenger phone runs a web app opened from the seat QR code, with no app to download. The crew tablet runs the speech AI and the request list. The crew app shows requests by seat with one-tap replies. Voice is never saved. Safety messages are checked by people, with no machine translation for safety. Most crew replies take two taps.

**Prototype scope (PDF "NOW").** 6 languages, 40 common needs, a live demo with cabin noise.

## Assumptions (mine, not from the PDF)

- **Languages:** Hindi, English, Japanese, Thai, Indonesian, Vietnamese. The PDF says "6 languages" without naming them, so I picked the persona's language, the crew's language, and the India/SE-Asia routes. The crew language is Japanese.
- **Catalogue size:** 22 needs in 5 categories (drinks, comfort, food, help, private), not 40 or 64. Adding a need is data only.
- **Translations** are prototype drafts and need native-speaker and airline review. Safety briefing and announcement texts are labelled as sample content.
- **The IFE seatback** is assumed to have no microphone and no keyboard. It offers pictures, the show-to-crew card and read-aloud replies in headphones, but no voice input or typing.
- **The IFE stores nothing.** There is no name and no needs profile on the shared screen. "End session" or 3 minutes of inactivity clears it.
- **The phone app** is an Expo app, which also runs on the web. The PDF specifies a PWA opened from the QR code, and the Expo web build approximates that.
- **"Private request"** (seen in the PDF mockup) is interpreted as discreet needs. The shared screen shows only "a crew member has been asked to come to your seat".
- **Delivery semantics:** *pending* until the crew tablet confirms receipt, *sent* = receipt confirmed, *acknowledged* = a crew member replied, *failed* after retries, or after 60 s without a connection.

---

## Screens

**Mobile (portrait).**
- Onboarding: language → seat (simulated QR scan or typed, validated) → optional needs, consent to share them, and an optional name used only for the greeting. Alternatively, "Use my booking details (simulated)" loads the PDF persona.
- **Home:** greeting, connection status, current request card, 8 big picture buttons, "More", "Private request", **hold to speak** and "type instead".
- Overlays: review & send (with optional detail such as "to take medicine"), "Did you mean this?", full-screen **show-to-crew** card, and the **crew reply** (text + picture + voice + buzz, then "Thank you").
- Tabs: Home · Requests · Card (works offline) · Flight (captions, picture safety briefing, arrival help) · Settings (language, text size, high contrast, reduce motion, reply channels, needs and consent, seat, name, clear data, prototype controls).

**IFE (landscape, 1280×720 baseline, scales with the viewport).**
- Attract screen ("Touch to start" cycling through all 6 languages) → language picker → main.
- A persistent top bar: seat, **connection status**, language, **End session**. A persistent left rail with **Home** first: Ask for help · Show to crew · Safety · Announcements · Display & sound.
- Home: large picture grid plus a "My requests" panel. Choosing a need: category tabs. Review: shows exactly what the crew will see in Japanese. Live status: 3-step tracker with retry, show-to-crew and cancel. The reply dialog reads the reply aloud.
- "Are you still there?" countdown after inactivity, then automatic clear.

**Crew console (simulator).** Seat map rows 21–26, request list, detail (Japanese + English gloss, purpose, language, consented tags), one-tap replies, announcement caption templates, and an optional auto-reply.

## Demo walkthrough (about 3 minutes)

1. Open `http://localhost:5173`, then **Crew console**, which opens a new tab. Keep it beside the passenger window.
2. **IFE:** go back to the selector and open **IFE seatback screen**. Touch to start → **हिन्दी**. Open **Prototype controls** (bottom right) → *Crew console in another tab*. The top bar should say *क्रू से जुड़े हैं* (connected to crew).
3. Tap **गरम पानी** (hot water) → **दवाई के लिए** (for medicine) → **क्रू को भेजें** (send to crew). The status moves *Sending… → Crew has received it* only when the crew tablet confirms. The console shows **23C · お湯 · 服薬のため**.
4. In the console, tap **すぐにお持ちします**. The IFE shows and reads aloud *हम इसे तुरंत ला रहे हैं।* → **धन्यवाद** (thank you).
5. In the console, tap a caption such as the seatbelt one. It appears on the IFE in Hindi.
6. Prototype controls → **No cabin network**. Send a blanket request. It stays *Waiting for connection*, and **Show to crew** opens the big bilingual card. Switch back to *Good* and it is delivered. With the console tab closed, requests retry and then show **Not delivered** with *Try again*.
7. **End session** → confirm. The screen returns to the attract state with nothing kept.
8. **Mobile:** open **Mobile app** → *Use my booking details (simulated)*. Hold **बोलने के लिए दबाकर रखें** (hold to speak) and release. The first simulated utterance is noisy ("… गरम … चाहिए …"), so the app asks **क्या आपका मतलब यह है?** with hot water / tea / blanket pictures, like PDF mockup step 2. Pick hot water → send. The simulated crew replies after about 2.5 s with text, voice and buzz. Hold again: the clear utterance goes straight to review with "for medicine" pre-filled. You can also tap once to start and tap again to finish, or use **Type instead** (e.g. "garam pani for my tablets").
9. Settings → Prototype controls → **Offline**, and repeat to see honest pending and failed states. Try **A++** text size and high contrast.

---

## Integrations: what is real and what is mocked

| Area | Status in this prototype | Adapter |
| --- | --- | --- |
| Cabin network → crew tablet | **Mock.** In-memory bus with an auto-replying simulated crew, or BroadcastChannel to the console tab (same browser only). Good, unstable (50% loss) or offline network can be simulated. | `CabinLink`, `CabinBus` (`packages/shared/src/cabin`) |
| Crew tablet / crew app | **Simulator** (`#/crew`), not the production crew app | `CrewTablet` |
| Speech recognition (DeepFilterNet + Whisper) | **Mock.** Records nothing and returns scripted noisy or clear utterances. | `SpeechRecognizer` / `MockSpeechRecognizer` |
| Intent matching (multilingual-e5, 85% threshold) | **Stand-in.** Deterministic offline keyword matcher with the same contract (ranked candidates + confidence, 0.85 threshold). It works on typed text in 6 languages plus romanised Hindi. | `IntentMatcher` |
| Text-to-speech | **Real, on-device.** `expo-speech` on mobile; the browser `speechSynthesis` on the IFE. Not routed through any IFE audio API. | `Speaker` |
| Haptics ("buzz") | **Real** on iOS/Android (`expo-haptics`), no-op on web | `Buzzer` |
| Seat QR scan, booking data | **Mock** (returns 23C / the PDF persona) | `simulateSeatQrScan`, `BookingAdapter` |
| IFE seat identity | **Mock** (`?seat=` URL parameter) | `ifeSeatFromUrl` |
| Persistence | Phone: AsyncStorage (local only). IFE: none, by design. | `runtime.ts` |

## Offline behaviour

- Works with no internet at all; nothing calls the internet. The IFE page links Google Fonts as a progressive enhancement and falls back to system fonts. A real seatback build should self-host the fonts.
- These work with no cabin connection either: picture grid, show-to-crew card, picture safety briefing, settings, and composing requests. Composed requests wait and send when the connection returns.
- These need the cabin connection to the crew tablet, and the UI says so: delivering requests, crew replies, and new announcement captions.

## Accessibility

- Touch targets are at least 56 dp on mobile and at least 88 px equivalent for primary IFE controls.
- Text size goes up to 150%, and mobile also respects the OS font scale, capped per element.
- High-contrast theme and a reduce-motion setting.
- Palette contrast is unit-tested against WCAG AA.
- Screen-reader roles, labels, states and live regions are set. Focus moves to the heading on screen change. IFE dialogs trap focus and close with Escape.
- Hold-to-speak also works as tap-to-start/tap-to-finish, and as a screen-reader or keyboard toggle.
- The IFE is fully keyboard operable.
- Status is shown with icon + text + colour, never colour alone.

## Tests

- `packages/shared/test`: matcher, including the PDF story and every language's sample utterances; the delivery state machine (confirmation, retries, offline wait and failure, unstable link, duplicates, consent, seat filtering, end-session clear, announcements, heartbeat status); seat validation; translation completeness; contrast.
- `apps/ife/test`: IFE end-to-end in jsdom covering the Hindi hot-water journey, offline pending, private neutrality, end session, inactivity clear, and no personal data shown.

## Remaining work

- Real crew tablet service (FastAPI + WebSockets + SQLite, per the PDF) and a production crew app.
- On-tablet DeepFilterNet + Whisper + multilingual-e5 pipeline. This needs real microphone capture on the phone and noise testing at 75–85 dB.
- Expand the catalogue to 40 and then 64 needs. Get professional, human-checked translations, airline-approved safety content and real announcement templates.
- PWA packaging for the QR-code flow (service worker, installable). Integration with the airline booking/PNR for language and needs. Medical and wheelchair handover to ground systems.
- Real IFE platform integration (seat identity, headphone audio routing, handset input) and the certification work that requires. None of this is done here.
- Native device testing of the Expo app (it has been exported and exercised on the web only in this environment). Smaller bundle: switch to per-icon imports.
