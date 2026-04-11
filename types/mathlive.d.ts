import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<any>;
        style?: React.CSSProperties;
        'math-virtual-keyboard-policy'?: string;
      };
    }
  }
}
