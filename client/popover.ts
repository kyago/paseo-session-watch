import { useSyncExternalStore } from "react";

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
  running: number;
  needsInput: number;
}
interface Shared {
  state: State;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setTimeout>;
  /** The sidebar row's DOM node, for the overlay's pointer tracking. */
  row?: unknown;
}
const KEY = "__paseoSessionWatchPopover";
const g = globalThis as { [KEY]?: Shared };
const shared = (g[KEY] ??= {
  state: { anchor: null, hover: false, running: 0, needsInput: 0 },
  listeners: new Set(),
});

export function setPopover(patch: Partial<State>): void {
  const next = { ...shared.state, ...patch };
  if (JSON.stringify(next) === JSON.stringify(shared.state)) return;
  shared.state = next;
  for (const listener of shared.listeners) listener();
}

export const setRow = (row: unknown): void => {
  shared.row = row;
};
export const getRow = (): unknown => shared.row;

export function hoverIn(): void {
  clearTimeout(shared.timer);
  shared.timer = undefined;
  setPopover({ hover: true });
}

/** Closes after a short grace, so the pointer can cross the gap between the row and the list. */
export function hoverOut(): void {
  // Called on every mouse move outside; a pending close must not be pushed back.
  shared.timer ??= setTimeout(() => {
    shared.timer = undefined;
    setPopover({ hover: false });
  }, 250);
}

export const usePopover = (): State =>
  useSyncExternalStore(
    (listener) => {
      shared.listeners.add(listener);
      return () => shared.listeners.delete(listener);
    },
    () => shared.state,
  );
