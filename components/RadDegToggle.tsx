'use client';

interface RadDegToggleProps {
  value: 'RAD' | 'DEG';
  onChange: (mode: 'RAD' | 'DEG') => void;
}

export default function RadDegToggle({ value, onChange }: RadDegToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[#333333] bg-[#2f2f2f]">
      {(['RAD', 'DEG'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
            value === mode
              ? 'bg-[#2b7fff] text-white'
              : 'text-[#999999] hover:text-[#eeeeee]'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
