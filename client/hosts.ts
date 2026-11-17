import { useSyncExternalStore } from "react";

/**
 * Every host that has this plugin loads its own client bundle into the same window. They share one
 * registry on globalThis: one bundle (the first registered) owns the single overlay, and the board
 * lists only hosts that registered here, i.e. hosts where the plugin is installed and running.
 */
interface Instance {
  serverId: string;
  mount: () => () => void;
}
interface Shared {
  instances: Instance[];
  active?: { instance: Instance; unmount: () => void };
  hostKey: string;
  listeners: Set<() => void>;
}
const KEY = "__paseoFloatingPanelHosts";
const g = globalThis as { [KEY]?: Shared };
const shared = (g[KEY] ??= { instances: [], hostKey: "", listeners: new Set() });

function sync() {
  const hostKey = [...new Set(shared.instances.map((i) => i.serverId))].sort().join("\n");
  if (hostKey !== shared.hostKey) {
    shared.hostKey = hostKey;
    for (const listener of shared.listeners) listener();
  }
  const leader = shared.instances[0];
  if (shared.active?.instance === leader) return;
  // Unmount before mounting: both use the same overlay element id.
  shared.active?.unmount();
  shared.active = leader && { instance: leader, unmount: leader.mount() };
}

/** Registers this host's bundle; returns its release. */
export function registerHost(instance: Instance): () => void {
  shared.instances.push(instance);
  sync();
  return () => {
    const index = shared.instances.indexOf(instance);
    if (index < 0) return;
    shared.instances.splice(index, 1);
    sync();
  };
}

/** serverIds of hosts where the plugin is running in this window. */
export function useInstalledHosts(): ReadonlySet<string> {
  const hostKey = useSyncExternalStore(
    (listener) => {
      shared.listeners.add(listener);
      return () => shared.listeners.delete(listener);
    },
    () => shared.hostKey,
  );
  return new Set(hostKey ? hostKey.split("\n") : []);
}
