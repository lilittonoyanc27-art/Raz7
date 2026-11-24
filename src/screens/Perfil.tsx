import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { levelFromXp, useProgress, useUI, xpInLevel } from '../core/store';
import { Icon } from '../ui/Icon';
import { GameCanvas } from '../three/Stage';
import { Humanoid, newAnim, RAZMIK_LOOK } from '../three/Humanoid';
import { Ball3D } from '../three/Props';
import { ACCESSORIES, BALLS, BOOTS, type ShopItem } from '../data/shop';
import { LEVELS } from '../core/types';
import { Es } from '../ui/Es';
import { sfx } from '../core/audio';

function Preview() {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const boots = useProgress((s) => s.boots);
  const acc = useProgress((s) => s.accessory);
  const ball = useProgress((s) => s.ballSkin);
  useFrame(({ camera }, dt) => {
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 0.85, 0);
    if (g.current) g.current.rotation.y += dt * 0.5;
  });
  return (
    <>
      <color attach="background" args={['#1b2233']} />
      <hemisphereLight args={['#ffffff', '#334', 1.3]} />
      <directionalLight position={[2, 4, 3]} intensity={2.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 40]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
      <group ref={g}>
        <Humanoid look={RAZMIK_LOOK(BOOTS.find((b) => b.id === boots)?.color, acc)} anim={anim} />
        <group position={[0.4, 0.11, 0.35]}>
          <Ball3D skin={ball} />
        </group>
      </group>
    </>
  );
}

export function Perfil() {
  const s = useProgress();
  const lvl = levelFromXp(s.xp);
  const Slot = ({ title, list, slot, cur }: { title: string; list: ShopItem[]; slot: 'boots' | 'ballSkin' | 'accessory'; cur: string }) => (
    <>
      <div className="section-title">{title}</div>
      <div className="row">
        {list.map((it) => {
          const owned = s.owned.includes(it.id);
          return (
            <button
              key={it.id}
              className={'btn small ' + (cur === it.id ? 'primary' : owned ? '' : 'ghost')}
              onClick={() => {
                if (!owned) {
                  useUI.getState().toast({ es: `Cómpralo en la tienda deportiva (${it.price} monedas).`, hy: `Գնիր սպորտային խանութում (${it.price} մետաղադրամ)։` }, 'info');
                  return;
                }
                sfx('click');
                s.equip(slot, it.id);
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 6, background: it.color, display: 'inline-block', border: '1px solid #fff' }} />
              {it.es} {!owned && `· ${it.price}`}
            </button>
          );
        })}
      </div>
    </>
  );
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>Mi perfil</h1>
          <div className="sub">Իմ էջը · Razmik · 12 años · Número 7</div>
        </div>
      </div>
      <div className="wrap profile">
        <div className="profile-top">
          <div className="profile-3d">
            <GameCanvas camFov={35}>
              <Preview />
            </GameCanvas>
          </div>
          <div className="panel" style={{ flex: 1, minWidth: 260 }}>
            <div className="result-grid">
              <div><b>{lvl}</b><span>Nivel</span></div>
              <div><b>{s.xp}</b><span>XP</span></div>
              <div><b>{s.coins}</b><span>Monedas</span></div>
              <div><b>{s.cups}</b><span>Copas</span></div>
            </div>
            <div className="bar"><div style={{ width: `${(xpInLevel(s.xp) / 300) * 100}%` }} /></div>
            <div className="hint" style={{ marginTop: 4 }}>{300 - xpInLevel(s.xp)} XP para el nivel {lvl + 1}</div>
            <div className="section-title">Nivel de español</div>
            <div className="seg">
              {LEVELS.map((l) => (
                <button key={l} className={s.level === l ? 'on' : ''} onClick={() => s.setLevel(l)}>{l}</button>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              <Es t={{ es: 'A1: frases cortas · A2: diálogos cotidianos · B1: situaciones complejas y respuestas libres.', hy: 'A1՝ կարճ նախադասություններ · A2՝ առօրյա երկխոսություններ · B1՝ բարդ իրավիճակներ և ազատ պատասխաններ։' }} />
            </div>
            <label className="row" style={{ marginTop: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={s.settings.autoLevel} onChange={(e) => s.setSettings({ autoLevel: e.target.checked })} />
              <span>Subir de nivel automáticamente según mis resultados</span>
            </label>
          </div>
        </div>
        <div className="note" style={{ marginTop: 10 }}>La camiseta naranja con el número 7 es tu uniforme oficial. ¡Personaliza tus botas, balones y accesorios!</div>
        <Slot title="Botas" list={BOOTS} slot="boots" cur={s.boots} />
        <Slot title="Colección de balones" list={BALLS} slot="ballSkin" cur={s.ballSkin} />
        <Slot title="Accesorios" list={ACCESSORIES} slot="accessory" cur={s.accessory} />
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={() => useUI.getState().go('interior', { id: 'tienda' })}>Ir a la tienda deportiva</button>
          <button className="btn" onClick={() => useUI.getState().go('records')}>Mis récords</button>
        </div>
      </div>
    </div>
  );
}
