import { lazy, Suspense, useEffect, useState } from 'react';
import { useProgress, useUI, levelFromXp } from '../core/store';
import { Icon } from '../ui/Icon';
import { playMusic, sfx } from '../core/audio';
import { Es } from '../ui/Es';

const MenuScene = lazy(() => import('../scenes/MenuScene').then((m) => ({ default: m.MenuScene })));

const BTN: { id: string; es: string; hy: string; icon: string; action: () => void; primary?: boolean }[] = [
  { id: 'cont', es: 'Continuar aventura', hy: 'Շարունակել արկածը', icon: 'bolt', primary: true, action: () => useUI.getState().go('city', { mission: Object.keys(useProgress.getState().missions).length ? '' : 'llegar' }) },
  { id: 'city', es: 'Explorar la ciudad', hy: 'Ուսումնասիրել քաղաքը', icon: 'map', action: () => useUI.getState().go('city', { spawn: 'casa' }) },
  { id: 'mis', es: 'Misiones', hy: 'Առաքելություններ', icon: 'star', action: () => useUI.getState().go('misiones') },
  { id: 'sim', es: 'Simuladores', hy: 'Սիմուլյատորներ', icon: 'home', action: () => useUI.getState().go('simuladores') },
  { id: 'comp', es: 'Competiciones', hy: 'Մրցումներ', icon: 'cup', action: () => useUI.getState().go('competiciones') },
  { id: 'mem', es: 'Juegos de memoria', hy: 'Հիշողության խաղեր', icon: 'ball', action: () => useUI.getState().go('memory') },
  { id: 'retos', es: 'Retos de español', hy: 'Իսպաներենի մարտահրավերներ', icon: 'mic', action: () => useUI.getState().go('retos') },
  { id: 'rec', es: 'Mis récords', hy: 'Իմ ռեկորդները', icon: 'cup', action: () => useUI.getState().go('records') },
  { id: 'perfil', es: 'Mi perfil', hy: 'Իմ էջը', icon: 'run', action: () => useUI.getState().go('perfil') },
  { id: 'conf', es: 'Configuración', hy: 'Կարգավորումներ', icon: 'settings', action: () => useUI.getState().go('config') },
];

export function MainMenu() {
  const xp = useProgress((s) => s.xp);
  const coins = useProgress((s) => s.coins);
  const lvl = useProgress((s) => s.level);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    playMusic('menu');
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="menu">
      <div className="menu-bg">
        <Suspense fallback={null}>
          <MenuScene />
        </Suspense>
      </div>
      <div className={'menu-ui ' + (ready ? 'in' : '')}>
        <div className="brand">
          <div className="brand-7">7</div>
          <div>
            <h1>RAZMIK 7</h1>
            <h2>MISIÓN CAMPEÓN</h2>
          </div>
        </div>
        <div className="subtitle">
          <Es t={{ es: 'Juega, aprende, compite y conviértete en un campeón.', hy: 'Խաղա, սովորիր, մրցիր և դարձիր չեմպիոն։' }} />
        </div>
        <div className="menu-buttons">
          {BTN.map((b, i) => (
            <button
              key={b.id}
              className={'menu-btn-item ' + (b.primary ? 'primary' : '')}
              style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              onClick={() => {
                sfx('click');
                b.action();
              }}
            >
              <Icon name={b.icon} size={20} />
              <span>{b.es}</span>
              <small>{b.hy}</small>
            </button>
          ))}
        </div>
        <div className="menu-foot">
          <span className="pill">Nivel {levelFromXp(xp)}</span>
          <span className="pill gold"><Icon name="coin" size={14} /> {coins}</span>
          <span className="pill">Español {lvl}</span>
          <button className="pill link" onClick={() => useUI.getState().go('informe')}>Informe para el profesor</button>
        </div>
      </div>
    </div>
  );
}
