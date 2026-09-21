import { PAD_COLORS } from '../../config/defaultBoard';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

/** Die sechs Tastenfarben als anklickbare Kreise. */
export function ColorSwatches({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Tastenfarbe">
      {PAD_COLORS.map(c => {
        const active = c.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={c.label}
            onClick={() => onChange(c.hex)}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${active ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
            style={{ background: c.hex, boxShadow: active ? `0 0 10px ${c.hex}` : undefined }}
          />
        );
      })}
    </div>
  );
}
