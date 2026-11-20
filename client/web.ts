import { Platform } from "react-native";

// This plugin typechecks without the DOM library. Declare only what this module uses.
interface OverlayElement {
  id: string;
  style: { cssText: string };
  remove(): void;
}
declare const document: {
  getElementById(id: string): OverlayElement | null;
  createElement(tag: "div"): OverlayElement;
  body: { appendChild(element: OverlayElement): void };
};
declare const window: {
  history: { pushState(state: null, unused: string, url: string): void };
  dispatchEvent(event: unknown): void;
};
declare const PopStateEvent: new (type: "popstate") => unknown;
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const ROOT_ID = "paseo-session-watch-root";
const PINNED_KEY = "paseo-session-watch:pinned";

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

/** Pinned survives remounts: Paseo can restart the plugin's client entry, e.g. while navigating. */
export function loadPinned(): boolean {
  return Platform.OS === "web" && localStorage.getItem(PINNED_KEY) === "1";
}

export function savePinned(pinned: boolean): void {
  if (Platform.OS === "web") localStorage.setItem(PINNED_KEY, pinned ? "1" : "0");
}

/**
 * Hover for a View that contains pressables. Pressable's own onHoverIn/Out cannot be used on a wrapper:
 * react-native-web lets the innermost pressable claim the hover, which un-hovers its ancestors.
 * React Native's types do not list the mouse props react-native-web forwards.
 */
export const hoverProps = (onEnter: () => void, onLeave: () => void): object =>
  Platform.OS === "web" ? { onMouseEnter: onEnter, onMouseLeave: onLeave } : {};
