'use client';

import React, { useEffect, useState } from 'react';

const cls = 'w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-50 disabled:opacity-70';

/** Number input that keeps what you type (blank, "-", decimals) and commits once on blur or Enter: one undo step, no forced 0. */
export const NumberField: React.FC<{
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onCommit: (n: number) => void;
}> = ({ value, min, max, step, disabled, onCommit }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) {
      if (n !== value) onCommit(n);
    } else {
      setText(String(value));
    }
  };
  return (
    <input
      type="number"
      value={text}
      step={step}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cls}
    />
  );
};

/** Text input that commits on blur or Enter, so typing a name is one undo step, not one per letter. */
export const TextField: React.FC<{ value: string; disabled?: boolean; placeholder?: string; onCommit: (t: string) => void }> = ({
  value,
  disabled,
  placeholder,
  onCommit,
}) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text !== value) onCommit(text.trim());
  };
  return (
    <input
      type="text"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cls}
    />
  );
};
