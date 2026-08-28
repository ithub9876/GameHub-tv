/**
 * GameHub-TV Google TV / Android TV Remote Control & D-pad Navigation Hook
 * Handles spatial D-pad navigation, key bindings, sound feedback, and focus management
 */

import { useEffect, useCallback } from 'react';
import { soundEffects } from '../services/soundEffects';

export interface TvRemoteHandlers {
  onUp?: () => boolean | void;
  onDown?: () => boolean | void;
  onLeft?: () => boolean | void;
  onRight?: () => boolean | void;
  onSelect?: () => boolean | void;
  onBack?: () => boolean | void;
  onMenu?: () => boolean | void;
  onPairingShortcut?: () => boolean | void;
  onDiagnosticsShortcut?: () => boolean | void;
  onFullscreenShortcut?: () => boolean | void;
}

export function useTvRemote(handlers: TvRemoteHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Avoid intercepting when user is actively typing in a form input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !['Escape', 'Enter'].includes(e.key)
      ) {
        return;
      }

      // Android TV / Remote key mappings:
      // D-Pad Up: ArrowUp, keyCode 38 or 19
      // D-Pad Down: ArrowDown, keyCode 40 or 20
      // D-Pad Left: ArrowLeft, keyCode 37 or 21
      // D-Pad Right: ArrowRight, keyCode 39 or 22
      // Select/Center: Enter, keyCode 13 or 23 (KEYCODE_DPAD_CENTER)
      // Back: Escape, Backspace, keyCode 27, 8, or 4 (KEYCODE_BACK)
      // Menu: KeyM, KeyI, keyCode 82 (KEYCODE_MENU)

      const key = e.key;
      const keyCode = e.keyCode;

      let handled = false;

      // UP
      if (key === 'ArrowUp' || keyCode === 19 || keyCode === 38) {
        if (handlers.onUp) {
          const res = handlers.onUp();
          handled = res !== false;
        }
        if (handled) soundEffects.playFocusTick();
      }
      // DOWN
      else if (key === 'ArrowDown' || keyCode === 20 || keyCode === 40) {
        if (handlers.onDown) {
          const res = handlers.onDown();
          handled = res !== false;
        }
        if (handled) soundEffects.playFocusTick();
      }
      // LEFT
      else if (key === 'ArrowLeft' || keyCode === 21 || keyCode === 37) {
        if (handlers.onLeft) {
          const res = handlers.onLeft();
          handled = res !== false;
        }
        if (handled) soundEffects.playFocusTick();
      }
      // RIGHT
      else if (key === 'ArrowRight' || keyCode === 22 || keyCode === 39) {
        if (handlers.onRight) {
          const res = handlers.onRight();
          handled = res !== false;
        }
        if (handled) soundEffects.playFocusTick();
      }
      // SELECT / ENTER
      else if (
        key === 'Enter' ||
        key === 'NumpadEnter' ||
        key === ' ' ||
        keyCode === 13 ||
        keyCode === 23
      ) {
        if (handlers.onSelect) {
          const res = handlers.onSelect();
          handled = res !== false;
        }
        if (handled) soundEffects.playSelect();
      }
      // BACK / ESCAPE
      else if (
        key === 'Escape' ||
        key === 'Backspace' ||
        keyCode === 27 ||
        keyCode === 8 ||
        keyCode === 4
      ) {
        if (handlers.onBack) {
          const res = handlers.onBack();
          handled = res !== false;
        }
        if (handled) soundEffects.playBack();
      }
      // MENU / INFO / STATS HUD
      else if (
        key === 'm' ||
        key === 'M' ||
        key === 'i' ||
        key === 'I' ||
        keyCode === 82
      ) {
        if (handlers.onMenu) {
          const res = handlers.onMenu();
          handled = res !== false;
        }
      }
      // PAIRING SHORTCUT (Key 'P')
      else if (key === 'p' || key === 'P') {
        if (handlers.onPairingShortcut) {
          const res = handlers.onPairingShortcut();
          handled = res !== false;
        }
      }
      // DIAGNOSTICS SHORTCUT (Key 'D')
      else if (key === 'd' || key === 'D') {
        if (handlers.onDiagnosticsShortcut) {
          const res = handlers.onDiagnosticsShortcut();
          handled = res !== false;
        }
      }
      // FULLSCREEN SHORTCUT (Key 'F')
      else if (key === 'f' || key === 'F') {
        if (handlers.onFullscreenShortcut) {
          const res = handlers.onFullscreenShortcut();
          handled = res !== false;
        }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [enabled, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown]);
}
