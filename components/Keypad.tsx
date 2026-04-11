'use client';

import { useEffect } from 'react';

interface KeypadProps {
  mathfieldRef: React.RefObject<any>;
}

export default function Keypad({ mathfieldRef }: KeypadProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;

    vk.layouts = [
      {
        label: 'main',
        rows: [
          [
            { latex: 'a^2', insert: '#@^{2}' },
            { latex: 'a^b', insert: '#@^{#?}' },
            { latex: '|a|', insert: '\\left|#0\\right|' },
            '[7]', '[8]', '[9]',
            { latex: '\\div', insert: '\\div' },
            { latex: '\\%', insert: '\\%' },
            { latex: '\\frac{a}{b}', insert: '\\frac{#@}{#?}' },
          ],
          [
            { latex: '\\sqrt{}', insert: '\\sqrt{#0}' },
            { latex: '\\sqrt[n]{}', insert: '\\sqrt[#?]{#0}' },
            { latex: '\\pi', insert: '\\pi' },
            '[4]', '[5]', '[6]',
            { latex: '\\times', insert: '\\times' },
            '[left]', '[right]',
          ],
          [
            { latex: '\\sin', insert: '\\sin(#0)' },
            { latex: '\\cos', insert: '\\cos(#0)' },
            { latex: '\\tan', insert: '\\tan(#0)' },
            '[1]', '[2]', '[3]',
            { latex: '-', insert: '-' },
            { label: '[backspace]', width: 2 },
          ],
          [
            { latex: '(', insert: '(' },
            { latex: ')', insert: ')' },
            { latex: ',', insert: ',' },
            '[0]', '[.]',
            { latex: '\\text{ans}', insert: '\\text{ans}' },
            { latex: '+', insert: '+' },
            { label: '[action]', width: 3 },
          ],
        ],
      },
    ];

    const container = document.getElementById('keypad-container');
    if (container) vk.container = container;
    vk.show();
  }, []);

  return <div id="keypad-container" className="w-full" />;
}
