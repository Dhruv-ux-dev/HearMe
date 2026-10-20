import {
  ANNOUNCEMENTS,
  CrewTablet,
  createBroadcastBus,
  getNeed,
  getPurpose,
  languageInfo,
  REPLIES,
  t,
  ago,
  type CrewRequest,
  type LangCode,
  type ProfileTag,
} from '@hearme/shared';
import { useExternal } from '@hearme/shared/react';
import { Lock, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NeedIcon } from '../common/Icon';
import { themeVars } from '../common/theme';

/**
 * SIMULATED crew tablet console (third piece of the PDF architecture: "Crew app —
 * requests by seat, with one-tap replies"). It exists so the passenger
 * experiences can be demonstrated end to end; it is not the production crew app.
 * Talks to passenger tabs over BroadcastChannel (same browser, same origin).
 */
export function CrewConsole() {
  const [tablet, setTablet] = useState<CrewTablet | 'unsupported' | null>(null);
  useEffect(() => {
    const bus = createBroadcastBus();
    if (!bus) {
      setTablet('unsupported');
      return;
    }
    const t = new CrewTablet(bus, { crewName: 'Aoi', autoReplyDelayMs: 2500 });
    setTablet(t);
    return () => {
      t.dispose();
      bus.close();
    };
  }, []);
  if (tablet === null) return null;
  if (tablet === 'unsupported') {
    return (
      <div className="crew" style={themeVars(false)}>
        <p role="alert">This browser does not support BroadcastChannel, so the crew console simulator cannot connect.</p>
      </div>
    );
  }
  return <Console tablet={tablet} />;
}

const LANG_JA: Record<LangCode, string> = { hi: 'ヒンディー語', en: '英語', ja: '日本語', th: 'タイ語', id: 'インドネシア語', vi: 'ベトナム語' };
const tagJa = (tag: ProfileTag) => t('ja', `tag.${tag}`);
const tagEn = (tag: ProfileTag) => t('en', `tag.${tag}`);

function Console({ tablet }: { tablet: CrewTablet }) {
  const state = useExternal(tablet);
  const [selected, setSelected] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const open = state.requests.filter((r) => r.status === 'new' || r.status === 'replied');
  const sel = state.requests.find((r) => r.requestId === selected) ?? open[0];
  const seatsWithRequests = new Set(open.map((r) => r.seat));
  const newCount = state.requests.filter((r) => r.status === 'new').length;

  return (
    <div className="crew" style={themeVars(false)} lang="ja">
      <header className="crew-top">
        <strong>HearMe Crew</strong> · 客室リクエスト
        <span className="crew-count" aria-label={`${newCount} new`}>
          {newCount}件
        </span>
        <span className="crew-sim" lang="en">
          SIMULATOR — not the production crew app
        </span>
        <label className="crew-auto" lang="en">
          <input type="checkbox" checked={state.autoReply} onChange={(e) => tablet.setAutoReply(e.target.checked)} /> Auto-reply after 2.5 s
        </label>
      </header>
      <div className="crew-body">
        <section className="crew-map" aria-label="Seat map rows 21–26">
          <h2 lang="en">ROWS 21–26</h2>
          {[21, 22, 23, 24, 25, 26].map((row) => (
            <div key={row} className="crew-row">
              <span className="crew-rownum">{row}</span>
              {['A', 'B', 'C', '', 'D', 'E', 'F'].map((col, i) =>
                col ? (
                  <span key={col} className={`crew-seat${seatsWithRequests.has(`${row}${col}`) ? ' on' : ''}`} title={`${row}${col}`} />
                ) : (
                  <span key={`gap${i}`} className="crew-aisle" />
                ),
              )}
            </div>
          ))}
          <p className="crew-mapnote" lang="en">
            Requests from other rows appear in the list.
          </p>
        </section>

        <section className="crew-list" aria-label="Requests">
          {state.requests.length === 0 && (
            <p className="crew-empty">
              リクエストはまだありません。
              <br />
              <span lang="en">No requests yet. Send one from the IFE screen or the phone preview (set Prototype controls → “Crew console in another tab”).</span>
            </p>
          )}
          {state.requests.map((r) => (
            <button key={r.requestId} className={`crew-item${sel?.requestId === r.requestId ? ' active' : ''} crew-item--${r.status}`} onClick={() => setSelected(r.requestId)}>
              <span className="crew-item__seat">{r.seat}</span>
              <span className="crew-item__need">{getNeed(r.needId)?.label.ja}</span>
              <span className="crew-item__status" lang="en">
                {r.status}
              </span>
            </button>
          ))}
        </section>

        {sel ? <Detail r={sel} tablet={tablet} /> : <section className="crew-detail" />}

        <section className="crew-ann" aria-label="Announcements">
          <h2>
            <Megaphone aria-hidden /> アナウンス字幕 <span lang="en">Captions</span>
          </h2>
          <p className="crew-mapnote" lang="en">
            Pre-translated, human-checked templates only. No live machine translation for safety.
          </p>
          {ANNOUNCEMENTS.map((a) => (
            <button key={a.id} className={`crew-annbtn${a.safety ? ' safety' : ''}`} onClick={() => tablet.announce(a.id)}>
              <span>{a.text.ja}</span>
              <small lang="en">{a.text.en}</small>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

function Detail({ r, tablet }: { r: CrewRequest; tablet: CrewTablet }) {
  const need = getNeed(r.needId);
  const purpose = getPurpose(r.purposeId);
  return (
    <section className="crew-detail" aria-live="polite">
      <div className="crew-detail__head">
        <span className="crew-detail__seat">{r.seat}</span>
        <span className="crew-detail__ago">{ago(r.receivedAt)}前</span>
      </div>
      <div className="crew-detail__need">
        {need && (
          <span className="crew-detail__icon">
            <NeedIcon name={need.icon} size="100%" />
          </span>
        )}
        <div>
          <div className="crew-detail__ja">
            {need?.private && <Lock aria-label="private" />} {need?.label.ja} <span lang="en">· {need?.label.en}</span>
          </div>
          {purpose && (
            <div className="crew-detail__purpose">
              {purpose.label.ja} <span lang="en">· {purpose.label.en}</span>
            </div>
          )}
        </div>
      </div>
      <div className="crew-tags">
        <span className="crew-tag crew-tag--lang">
          {LANG_JA[r.lang]} <span lang="en">{languageInfo(r.lang).englishName}</span>
        </span>
        {r.tags.map((tag) => (
          <span key={tag} className="crew-tag">
            {tagJa(tag)} <span lang="en">{tagEn(tag)}</span>
          </span>
        ))}
        <span className="crew-tag" lang="en">
          via {r.device === 'ife' ? 'seatback screen' : 'phone'} · {r.source}
        </span>
      </div>
      {r.status === 'cancelled' && <p className="crew-note">取り消されました · Cancelled by passenger</p>}
      {r.status === 'thanked' && <p className="crew-note">ありがとう ♥ · Passenger said thank you</p>}
      <div className="crew-replies">
        {REPLIES.map((rep) => (
          <button
            key={rep.id}
            className={`crew-reply${r.reply?.replyId === rep.id ? ' chosen' : ''} crew-reply--${rep.tone}`}
            disabled={r.status === 'cancelled'}
            onClick={() => tablet.reply(r.requestId, rep.id)}
          >
            <span>{rep.text.ja}</span>
            <small lang="en">{rep.text.en}</small>
          </button>
        ))}
      </div>
      <p className="crew-mapnote" lang="en">
        The passenger receives the reply in {languageInfo(r.lang).englishName}: “{REPLIES[0]!.text[r.lang]}” …
      </p>
    </section>
  );
}
