import { useUI } from '../core/store';
import { Es } from './Es';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + t.kind}>
          <Es t={t.t} />
        </div>
      ))}
    </div>
  );
}
