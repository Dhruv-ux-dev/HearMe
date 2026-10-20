import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { themeVars } from '../common/theme';

/** Prototype mode selector: Mobile, IFE seatback, or the crew console simulator. */
export function Launcher() {
  return (
    <div className="launcher" style={themeVars(false)}>
      <header className="launcher__head">
        <div className="launcher__brand">
          Hear<span>Me</span>
        </div>
        <p className="launcher__tag">Helping passengers and cabin crew understand each other. In any language. In a noisy cabin. Even with no internet.</p>
        <p className="launcher__proto">Prototype · simulated crew tablet and cabin network · not integrated with or certified for any aircraft system</p>
      </header>
      <nav className="launcher__modes" aria-label="Choose a prototype mode">
        <a className="launcher__card" href="#/mobile">
          <Smartphone aria-hidden />
          <strong>Mobile app</strong>
          <span>Passenger’s phone, opened from the seat QR code. Portrait, touch, voice or pictures.</span>
        </a>
        <a className="launcher__card" href="#/ife">
          <Monitor aria-hidden />
          <strong>IFE seatback screen</strong>
          <span>Landscape, shared device. Large controls, no typing, end-and-clear session.</span>
        </a>
        <a className="launcher__card launcher__card--muted" href="#/crew" target="_blank" rel="noreferrer">
          <Tablet aria-hidden />
          <strong>Crew console (simulator)</strong>
          <span>Opens in a new tab. Receives requests by seat and sends one-tap replies.</span>
        </a>
      </nav>
      <p className="launcher__foot">
        Tip: to watch both sides, open the crew console, then in the passenger app choose <em>Prototype controls → Crew console in another tab</em>.
      </p>
    </div>
  );
}

/** The Expo app's web export, shown inside a phone frame. */
export function MobilePreview() {
  const [state, setState] = useState<'checking' | 'ok' | 'missing'>('checking');
  const src = import.meta.env.VITE_MOBILE_URL ?? `${import.meta.env.BASE_URL}mobile/index.html`;
  useEffect(() => {
    if (import.meta.env.VITE_MOBILE_URL) return setState('ok');
    fetch(src, { method: 'GET' })
      .then((r) => r.text().then((body) => setState(r.ok && body.includes('<div id="root"') ? 'ok' : 'missing')))
      .catch(() => setState('missing'));
  }, [src]);
  return (
    <div className="mobile-stage" style={themeVars(false)}>
      <a className="mobile-stage__back" href="#/">
        ← Modes
      </a>
      {state === 'ok' && (
        <div className="phone">
          <iframe title="HearMe mobile app" src={src} className="phone__screen" />
        </div>
      )}
      {state === 'missing' && (
        <div className="mobile-stage__missing" role="alert">
          <h1>The mobile web build is not available yet</h1>
          <p>Build it once (from the repo root):</p>
          <pre>npm run build:mobile-web</pre>
          <p>
            Or run the Expo app directly: <code>npm run mobile</code> (scan the QR code with Expo Go on Android/iOS) or <code>npm run mobile:web</code>.
          </p>
        </div>
      )}
      {state === 'checking' && <p>Loading…</p>}
    </div>
  );
}
