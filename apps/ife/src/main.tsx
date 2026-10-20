import { DemoCabinLink, PassengerSession } from '@hearme/shared';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ifeSeatFromUrl } from './common/webAdapters';
import { CrewConsole } from './crew/CrewConsole';
import { IfeApp } from './ife/IfeApp';
import { Launcher, MobilePreview } from './launcher/Launcher';
import './styles.css';

type Route = 'launcher' | 'ife' | 'crew' | 'mobile';

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h === 'ife' || h === 'crew' || h === 'mobile' ? h : 'launcher';
}

// One IFE session per page load. The seatback keeps nothing between sessions.
let ife: { link: DemoCabinLink; session: PassengerSession; seat: string } | null = null;
function ifeRuntime() {
  if (!ife) {
    const link = new DemoCabinLink('simulated');
    ife = { link, session: new PassengerSession({ link, device: 'ife' }), seat: ifeSeatFromUrl() };
  }
  return ife;
}

function Root() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    document.title = { launcher: 'HearMe prototype', ife: 'HearMe · Seatback', crew: 'HearMe Crew (simulator)', mobile: 'HearMe · Mobile' }[route];
  }, [route]);
  const idle = Number(new URLSearchParams(window.location.search).get('idle'));
  switch (route) {
    case 'ife': {
      const rt = ifeRuntime();
      return <IfeApp {...rt} idleMs={idle > 0 ? idle * 1000 : undefined} />;
    }
    case 'crew':
      return <CrewConsole />;
    case 'mobile':
      return <MobilePreview />;
    default:
      return <Launcher />;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
