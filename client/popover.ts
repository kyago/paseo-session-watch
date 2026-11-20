import { useSyncExternalStore } from "react";
import { loadPinned, savePinned } from "./web";

export interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The sidebar row lives in Paseo's tree and the session list in our overlay root, possibly in
 * another host's bundle, so they meet in one store on globalThis (same reason as hosts.ts).
 */
interface State {
  /** Where the sidebar row is on screen; null while the sidebar is collapsed. */
  anchor: Anchor | null;
  hover: boolean;
  pinned: boolean;
  running: number;
  needsInput: number;
}
interface Shared {
  state: State;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setTimeout>;
}
const KEY = "__paseoFloatingPanelPopover";
const g = globalThis as { [KEY]?: Shared };
const shared = (g[KEY] ??= {
  state: { anchor: null, hover: false, pinned: loadPinned(), running: 0, needsInput: 0 },
  listeners: new Set(),
});

export function setPopover(patch: Partial<State>): void {
  const next = { ...shared.state, ...patch };
  if (JSON.stringify(next) === JSON.stringify(shared.state)) return;
  shared.state = next;
  for (const listener of shared.listeners) listener();
}

export function hoverIn(): void {
  clearTimeout(shared.timer);
  setPopover({ hover: true });
}

/** Closes after a short grace, so the pointer can cross the gap between the row and the list. */
export function hoverOut(): void {
  clearTimeout(shared.timer);
  shared.timer = setTimeout(() => setPopover({ hover: false }), 250);
}

export function togglePinned(): void {
  const pinned = !shared.state.pinned;
  savePinned(pinned);
  setPopover({ pinned });
}

export const usePopover = (): State =>
  useSyncExternalStore(
    (listener) => {
      shared.listeners.add(listener);
      return () => shared.listeners.delete(listener);
    },
    () => shared.state,
  );
