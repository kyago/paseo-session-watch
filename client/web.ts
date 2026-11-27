import { Platform } from "react-native";

// This plugin typechecks without the DOM library. Declare only what this module uses.
interface OverlayElement {
  id: string;
  style: { cssText: string };
  remove(): void;
}
interface Node {
  contains(other: unknown): boolean;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
}
declare const document: {
  elementFromPoint(x: number, y: number): unknown;
  getElementById(id: string): OverlayElement | null;
  createElement(tag: "div"): OverlayElement;
  body: { appendChild(element: OverlayElement): void };
  querySelectorAll(selector: "textarea"): ArrayLike<Node>;
};
interface ShortcutEvent {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}
declare const window: {
  innerHeight: number;
  addEventListener(type: "keydown", listener: (event: ShortcutEvent) => void, capture: boolean): void;
  removeEventListener(type: "keydown", listener: (event: ShortcutEvent) => void, capture: boolean): void;
  addEventListener(type: "mousemove", listener: (event: { target: unknown }) => void): void;
  removeEventListener(type: "mousemove", listener: (event: { target: unknown }) => void): void;
  history: { pushState(state: null, unused: string, url: string): void };
  dispatchEvent(event: unknown): void;
};
declare const PopStateEvent: new (type: "popstate") => unknown;

const ROOT_ID = "paseo-session-watch-root";

/** A click-through layer over the whole window, outside Paseo's layout so the sidebar cannot unmount it. */
export function createOverlayRoot(): {
  element: OverlayElement;
  remove(): void;
} | null {
  if (Platform.OS !== "web") return null;
  document.getElementById(ROOT_ID)?.remove();
  const element = document.createElement("div");
  element.id = ROOT_ID;
  element.style.cssText =
    "position:fixed;inset:0;display:flex;flex-direction:column;pointer-events:none;z-index:40;";
  document.body.appendChild(element);
  return { element, remove: () => element.remove() };
}

/**
 * Paseo's own route for an agent tab, `/h/<server>/workspace/<id>?open=agent:<id>` (what the app builds
 * for agent links); popstate makes the app's router follow it. Workspace ids outside
 * [A-Za-z0-9._~-] use an encoding we do not reproduce, so those fall back to `/h/<server>/agent/<id>`.
 */
export function openAgentRoute(
  serverId: string,
  agentId: string,
  workspaceId?: string,
): void {
  if (Platform.OS !== "web") return;
  const host = `/h/${encodeURIComponent(serverId)}`;
  const route =
    workspaceId && /^[A-Za-z0-9._~-]+$/.test(workspaceId)
      ? `${host}/workspace/${workspaceId}?open=${encodeURIComponent(`agent:${agentId}`)}`
      : `${host}/agent/${encodeURIComponent(agentId)}`;
  window.history.pushState(null, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Hover for a View that contains pressables. Pressable's own onHoverIn/Out cannot be used on a wrapper:
 * react-native-web lets the innermost pressable claim the hover, which un-hovers its ancestors.
 * React Native's types do not list the mouse props react-native-web forwards.
 */
export const hoverProps = (onEnter: () => void, onLeave: () => void): object =>
  Platform.OS === "web" ? { onMouseEnter: onEnter, onMouseLeave: onLeave } : {};

export interface PointerReport {
  /** The row's rectangle, or null when it is not actually on screen (unmounted, hidden, or covered by another page). */
  row: { x: number; y: number; width: number; height: number } | null;
  /** The pointer is over the row or the panel. */
  inside: boolean;
}

/**
 * Reports on every mouse move where the pointer is and whether the sidebar row is really visible.
 * mouseleave alone is not enough: it never fires when the row is hidden or covered under the pointer,
 * e.g. when Paseo navigates to Settings, which would leave the list open.
 */
export function trackPointer(
  row: () => unknown,
  panel: () => unknown,
  report: (state: PointerReport) => void,
): () => void {
  if (Platform.OS !== "web") return () => {};
  const listener = ({ target }: { target: unknown }) => {
    const rowEl = row() as Node | null;
    const panelEl = panel() as Node | null;
    const rect = rowEl?.getBoundingClientRect();
    const onScreen =
      !!rowEl && !!rect && rect.width > 0 &&
      rowEl.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    report({
      row: onScreen && rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null,
      inside: (onScreen && rowEl!.contains(target)) || !!panelEl?.contains(target),
    });
  };
  window.addEventListener("mousemove", listener);
  return () => window.removeEventListener("mousemove", listener);
}

/**
 * Height to keep clear at the window bottom so cards whose left edge is `left` sit above any visible
 * composer they would overlap. The textarea's top stands in for the composer box's top.
 */
export function composerClearance(left: number): number {
  if (Platform.OS !== "web") return 0;
  let clearance = 0;
  for (const area of Array.from(document.querySelectorAll("textarea"))) {
    const rect = area.getBoundingClientRect();
    if (rect.width > 0 && rect.left + rect.width > left && rect.top > window.innerHeight / 2) {
      clearance = Math.max(clearance, window.innerHeight - rect.top);
    }
  }
  return clearance;
}

/**
 * Cmd/Ctrl+Option/Alt+Y allows, +N denies: unbound in Paseo's app and desktop menu. Not Cmd+Shift: macOS
 * Stickies takes Cmd+Shift+Y and Paseo's New Window menu Cmd+Shift+N before the page sees them.
 */
export function onPermissionShortcut(handler: (choice: "allow" | "deny") => void): () => void {
  if (Platform.OS !== "web") return () => {};
  const listener = (event: ShortcutEvent) => {
    if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.shiftKey || event.repeat) return;
    const choice = event.code === "KeyY" ? "allow" : event.code === "KeyN" ? "deny" : null;
    if (!choice) return;
    event.preventDefault();
    event.stopPropagation();
    handler(choice);
  };
  window.addEventListener("keydown", listener, true);
  return () => window.removeEventListener("keydown", listener, true);
}
