import { useEffect, type RefObject } from 'react';

export type DismissReason = 'escape' | 'outside';

/** Closes a popover/panel on Escape or on a pointer press outside `ref`. */
export function useDismiss(ref: RefObject<HTMLElement>, open: boolean, onDismiss: (reason: DismissReason) => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onDismiss('outside');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss('escape');
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onDismiss]);
}
