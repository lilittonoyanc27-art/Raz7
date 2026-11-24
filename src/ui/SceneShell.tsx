import type { ReactNode } from 'react';
import { GameCanvas, Lights } from '../three/Stage';
import { DialogPanel } from './DialogPanel';
import { InteractPrompt, StatsBar, TopLeft, usePlayTime } from './HUD';
import { TouchControls } from './TouchControls';
import type { TimeOfDay } from '../core/types';

export function SceneShell({ children, overlay, tod = 'dia', kick = false, minimap, follow = true, fov }: { children: ReactNode; overlay?: ReactNode; tod?: TimeOfDay; kick?: boolean; minimap?: ReactNode; follow?: boolean; fov?: number }) {
  usePlayTime();
  return (
    <div className="scene">
      <GameCanvas camFov={fov}>
        <Lights tod={tod} followPlayer={follow} />
        {children}
      </GameCanvas>
      <TopLeft>{minimap}</TopLeft>
      <StatsBar />
      {overlay}
      <InteractPrompt />
      <DialogPanel />
      <TouchControls kick={kick} />
    </div>
  );
}
