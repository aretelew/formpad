'use client';

import { Button } from '@/components/ui/button';

interface RadDegToggleProps {
  value: 'RAD' | 'DEG';
  onChange: (mode: 'RAD' | 'DEG') => void;
}

export default function RadDegToggle({ value, onChange }: RadDegToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-md border border-border bg-secondary">
      {(['RAD', 'DEG'] as const).map((mode) => (
        <Button
          key={mode}
          size="sm"
          variant={value === mode ? 'default' : 'ghost'}
          onClick={() => onChange(mode)}
          className="rounded-none px-3.5 text-xs font-semibold tracking-wide h-7"
        >
          {mode}
        </Button>
      ))}
    </div>
  );
}
