/** Stable handle wrapping a MathQuill instance exposed to parent components. */
export type FieldHandle = {
  focus: () => void;
  blur: () => void;
  getLatex: () => string;
  /** Programmatic set — does NOT fire the onLiveChange callback. */
  setLatex: (v: string) => void;
  keystroke: (key: string) => void;
  write: (latex: string) => void;
  cmd: (latex: string) => void;
  typedText: (text: string) => void;
};
