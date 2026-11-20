import type { PluginClientContext } from "@getpaseo/plugin/client";
import { AppRegistry, Platform } from "react-native";
import { FloatingRoot } from "./client/floating";
import { registerHost } from "./client/hosts";
import { SessionsItem } from "./client/sidebar";
import { createOverlayRoot } from "./client/web";
import { hostIdRpc } from "./shared/host";
import { setI18n, text } from "./client/text";

const APP_KEY = "paseo-floating-panel";

/** Mounts the session list and approval cards in their own root over the window, outside Paseo's layout. */
function mount(): () => void {
  const root = createOverlayRoot();
  if (!root) return () => {};
  AppRegistry.registerComponent(APP_KEY, () => FloatingRoot);
  // react-native-web returns the React root here; its unmountApplicationComponentAtRootTag expects that root, not the element.
  const app = AppRegistry.runApplication(APP_KEY, { rootTag: root.element }) as unknown as { unmount?(): void } | undefined;
  return () => {
    try {
      app?.unmount?.();
    } finally {
      root.remove();
    }
  };
}

/** Desktop only. Each host's bundle registers its serverId; one shared panel lists only those hosts. */
export default function contribute(client: PluginClientContext) {
  if (Platform.OS !== "web") return () => {};
  setI18n(client.i18n);
  let release: (() => void) | null = null;
  let removeItem: (() => void) | null = null;
  let stopped = false;
  void client
    .rpc(hostIdRpc, {})
    .then(({ serverId }) => {
      if (stopped) return;
      release = registerHost({ serverId, mount });
      // Only once this host is in the list, so the row never shows for a host the list leaves out.
      removeItem = client.addSidebarHeaderItem({ id: "sessions", title: text.message("sessions"), Component: SessionsItem });
    })
    .catch((error) =>
      console.warn("[floating-panel] could not start on this host; it stays out of the list", error),
    );
  return () => {
    stopped = true;
    release?.();
    removeItem?.();
  };
}
