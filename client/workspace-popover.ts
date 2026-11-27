import { useSyncExternalStore } from "react";
import type { Anchor } from "./popover";

/**
 * Workspace row badges render in Paseo's tree, possibly in another host's bundle, and the list for the
 * hovered workspace in our overlay root, so they meet in one store on globalThis (same reason as popover.ts).
 */
interface State {
  workspace: { id: string; name: string; anchor: Anchor } | null;
  hover: boolean;
}
interface Shared {
  state: State;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setTimeout>;
  /** The hovered badge's DOM node, for the overlay's pointer tracking. */
  row?: unknown;
}
const KEY = "__paseoSessionWatchWorkspace";
const g = globalThis as { [KEY]?: Shared };
const shared = (g[KEY] ??= { state: { workspace: null, hover: false }, listeners: new Set() });

function set(patch: Partial<State>): void {
  shared.state = { ...shared.state, ...patch };
  for (const listener of shared.listeners) listener();
}

export const getWorkspaceRow = (): unknown => shared.row;

export function showWorkspace(workspace: State["workspace"], row: unknown): void {
  clearTimeout(shared.timer);
  shared.timer = undefined;
  shared.row = row;
  set({ workspace, hover: true });
}

export function moveWorkspaceAnchor(anchor: Anchor | null): void {
  const { workspace } = shared.state;
  if (!workspace) return;
  if (!anchor) return set({ workspace: null, hover: false });
  if (JSON.stringify(anchor) !== JSON.stringify(workspace.anchor)) set({ workspace: { ...workspace, anchor } });
}

export function keepWorkspace(): void {
  clearTimeout(shared.timer);
  shared.timer = undefined;
}

/** Closes after a grace long enough to cross the rest of the sidebar row to the list. */
export function leaveWorkspace(): void {
  shared.timer ??= setTimeout(() => {
    shared.timer = undefined;
    set({ hover: false });
  }, 400);
}

export const useWorkspacePopover = (): State =>
  useSyncExternalStore(
    (listener) => {
      shared.listeners.add(listener);
      return () => shared.listeners.delete(listener);
    },
    () => shared.state,
  );
