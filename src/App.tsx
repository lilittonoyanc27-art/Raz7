import { lazy, Suspense, useEffect } from 'react';
import { useProgress, useUI } from './core/store';
import { installKeyboard } from './three/input';
import { TranslationCard } from './ui/Es';
import { Toasts } from './ui/Toasts';
import { audioCtx } from './core/audio';
import { MainMenu } from './screens/MainMenu';

const CityScene = lazy(() => import('./scenes/city/CityScene').then((m) => ({ default: m.CityScene })));
const TrainingScene = lazy(() => import('./scenes/TrainingScene').then((m) => ({ default: m.TrainingScene })));
const RaceScene = lazy(() => import('./scenes/RaceScene').then((m) => ({ default: m.RaceScene })));
const DetectiveScene = lazy(() => import('./scenes/DetectiveScene').then((m) => ({ default: m.DetectiveScene })));
const MazeScene = lazy(() => import('./scenes/MazeScene').then((m) => ({ default: m.MazeScene })));
const IslandScene = lazy(() => import('./scenes/IslandScene').then((m) => ({ default: m.IslandScene })));
const InteriorScene = lazy(() => import('./scenes/InteriorScene').then((m) => ({ default: m.InteriorScene })));
const Ruleta = lazy(() => import('./games/Ruleta').then((m) => ({ default: m.Ruleta })));
const Memory = lazy(() => import('./games/Memory').then((m) => ({ default: m.Memory })));
const Batalla = lazy(() => import('./games/Batalla').then((m) => ({ default: m.Batalla })));
const Habla = lazy(() => import('./games/Habla').then((m) => ({ default: m.Habla })));
const Trabalenguas = lazy(() => import('./games/Trabalenguas').then((m) => ({ default: m.Trabalenguas })));
const Hubs = lazy(() => import('./screens/Hubs'));
const Records = lazy(() => import('./screens/Records').then((m) => ({ default: m.Records })));
const Perfil = lazy(() => import('./screens/Perfil').then((m) => ({ default: m.Perfil })));
const Config = lazy(() => import('./screens/Config').then((m) => ({ default: m.Config })));
const Informe = lazy(() => import('./screens/Informe').then((m) => ({ default: m.Informe })));

function Loading() {
  return (
    <div className="loading">
      <div className="loading-ball" />
      <div>Cargando…</div>
    </div>
  );
}

export function App() {
  const screen = useUI((s) => s.screen);
  const params = useUI((s) => s.params);
  useEffect(() => installKeyboard(), []);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>;
      w.__ui = useUI;
      w.__progress = useProgress;
      import('./three/world').then((m) => (w.__world = m));
      import('./scenes/city/mission').then((m) => (w.__mission = m.useMission));
    }
  }, []);
  useEffect(() => {
    useProgress.getState().ensureDaily();
    const p = useProgress.getState();
    useProgress.setState({ stats: { ...p.stats, sessions: p.stats.sessions + 1 } });
    const unlock = () => audioCtx();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }, []);
  const key = screen + JSON.stringify(params);
  let view: JSX.Element;
  switch (screen) {
    case 'menu': view = <MainMenu />; break;
    case 'city': view = <CityScene key={key} />; break;
    case 'training': view = <TrainingScene key={key} />; break;
    case 'race': view = <RaceScene key={key} />; break;
    case 'detective': view = <DetectiveScene key={key} />; break;
    case 'maze': view = <MazeScene key={key} />; break;
    case 'island': view = <IslandScene key={key} />; break;
    case 'interior': view = <InteriorScene key={key} />; break;
    case 'ruleta': view = <Ruleta key={key} />; break;
    case 'memory': view = <Memory key={key} />; break;
    case 'batalla': view = <Batalla key={key} />; break;
    case 'habla': view = <Habla key={key} />; break;
    case 'trabalenguas': view = <Trabalenguas key={key} />; break;
    case 'records': view = <Records />; break;
    case 'perfil': view = <Perfil />; break;
    case 'config': view = <Config />; break;
    case 'informe': view = <Informe />; break;
    default: view = <Hubs key={key} which={screen} />;
  }
  return (
    <div className="app" lang="es">
      <Suspense fallback={<Loading />}>{view}</Suspense>
      <Toasts />
      <TranslationCard />
    </div>
  );
}
