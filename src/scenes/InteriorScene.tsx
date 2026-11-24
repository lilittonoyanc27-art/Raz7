import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addInteractable, resetWorld } from '../three/world';
import { useUI } from '../core/store';
import type { T } from '../core/types';
import { playAmbience, playMusic, sfx } from '../core/audio';
import { MissionPanel } from '../ui/HUD';
import { Es } from '../ui/Es';
import { TiendaInterior, type TaskLine } from './interiors/Tienda';
import { SuperInterior } from './interiors/Super';
import { RestauranteInterior, MENU } from './interiors/Restaurante';
import { AeropuertoInterior } from './interiors/Aeropuerto';
import { BusInterior } from './interiors/BusEquipo';
import { Icon } from '../ui/Icon';

const CFG: Record<string, { d: number; spawn: string; exitLabel: T }> = {
  tienda: { d: 16, spawn: 'tienda', exitLabel: { es: 'Salir a la calle', hy: 'Դուրս գալ փողոց' } },
  super: { d: 18, spawn: 'super', exitLabel: { es: 'Salir a la calle', hy: 'Դուրս գալ փողոց' } },
  restaurante: { d: 14, spawn: 'restaurante', exitLabel: { es: 'Salir del restaurante', hy: 'Դուրս գալ ռեստորանից' } },
  aeropuerto: { d: 22, spawn: 'aeropuerto', exitLabel: { es: 'Salir del aeropuerto', hy: 'Դուրս գալ օդանավակայանից' } },
  bus: { d: 18, spawn: 'escuela', exitLabel: { es: 'Bajar del autobús', hy: 'Իջնել ավտոբուսից' } },
};

export function InteriorScene() {
  const params = useUI((s) => s.params);
  const id = (params.id as string) || 'tienda';
  const cfg = CFG[id] ?? CFG.tienda;
  const [panel, setPanel] = useState<{ title: T; lines: TaskLine[]; extra?: T } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useMemo(() => resetWorld(), []);
  useEffect(() => {
    playMusic('calm');
    playAmbience(null);
    sfx('door');
    const exitZ = id === 'bus' ? 8.6 : cfg.d / 2 - 0.6;
    return addInteractable({
      id: 'exit',
      pos: new THREE.Vector3(0, 0, exitZ),
      radius: 1.8,
      label: cfg.exitLabel,
      onInteract: () => useUI.getState().go('city', { spawn: cfg.spawn }),
    }) as unknown as () => void;
  }, []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const start: [number, number, number] = id === "bus" ? [0, 0, 6.5] : [0, 0, cfg.d / 2 - 3.2];
  return (
    <SceneShell
      follow={false}
      overlay={
        <>
          {panel && (
            <MissionPanel title={panel.title} lines={panel.lines}>
              {panel.extra && (
                <div className="mp-hint">
                  <Es t={panel.extra} />
                </div>
              )}
              {id === 'restaurante' && (
                <button className="btn tiny" onClick={() => setMenuOpen(true)}>
                  <Icon name="star" size={14} /> Ver la carta
                </button>
              )}
            </MissionPanel>
          )}
          {menuOpen && <MenuCard onClose={() => setMenuOpen(false)} />}
        </>
      }
    >
      {id === 'tienda' && <TiendaInterior setPanel={setPanel} />}
      {id === 'super' && <SuperInterior setPanel={setPanel} />}
      {id === 'restaurante' && <RestauranteInterior setPanel={setPanel} openMenu={openMenu} />}
      {id === 'aeropuerto' && <AeropuertoInterior setPanel={setPanel} />}
      {id === 'bus' && <BusInterior setPanel={setPanel} />}
      <Player start={start} startYaw={Math.PI} camDist={id === 'bus' ? 2.6 : 4} />
    </SceneShell>
  );
}

function MenuCard({ onClose }: { onClose: () => void }) {
  const sections: [keyof typeof MENU, T][] = [
    ['primeros', { es: 'Primeros platos', hy: 'Առաջին ճաշատեսակներ' }],
    ['segundos', { es: 'Segundos platos', hy: 'Երկրորդ ճաշատեսակներ' }],
    ['bebidas', { es: 'Bebidas', hy: 'Խմիչքներ' }],
    ['postres', { es: 'Postres', hy: 'Աղանդեր' }],
  ];
  return (
    <div className="menu-card">
      <div className="menu-card-head">
        <b>LA CARTA · «EL GOL»</b>
        <button className="icon-btn" onClick={onClose}><Icon name="close" /></button>
      </div>
      {sections.map(([k, title]) => (
        <div key={k} className="menu-sec">
          <div className="menu-sec-t"><Es t={title} /></div>
          {MENU[k].map((d) => (
            <div key={d.t.es} className="menu-item">
              <Es t={d.t} />
              <span className="dots" />
              <b>{d.price} €</b>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
