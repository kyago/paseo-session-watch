import type { PluginClientContext } from "@getpaseo/plugin/client";
import { AppRegistry, Platform } from "react-native";
import { FloatingRoot } from "./client/floating";
import { registerHost } from "./client/hosts";
import { createOverlayRoot } from "./client/web";
import { hostIdRpc } from "./shared/host";

const APP_KEY = "paseo-floating-panel";

/** Mounts the panel in its own root over the window, independent of the sidebar. */
function mount(): () => void {
  const root = createOverlayRoot();
  if (!root) return () => {};
  AppRegistry.registerComponent(APP_KEY, () => FloatingRoot);
  AppRegistry.runApplication(APP_KEY, { rootTag: root.element });
  return () => {
    AppRegistry.unmountApplicationComponentAtRootTag(root.element as never);
    root.remove();
  };
}

/** Desktop only. Each host's bundle registers its serverId; one shared panel lists only those hosts. */
export default function contribute(client: PluginClientContext) {
  if (Platform.OS !== "web") return () => {};
  let release: (() => void) | null = null;
  let stopped = false;
  void client
    .rpc(hostIdRpc, {})
    .then(({ serverId }) => {
      if (!stopped) release = registerHost({ serverId, mount });
    })
    .catch((error) =>
      console.warn("[floating-panel] host id unavailable; this host stays out of the panel", error),
    );
  return () => {
    stopped = true;
    release?.();
  };
}
