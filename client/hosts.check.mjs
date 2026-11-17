// node --experimental-strip-types client/hosts.check.mjs — two host bundles share one panel; leader hands off.
import assert from "node:assert/strict";
const { registerHost } = await import("./hosts.ts");
const log = [];
const inst = (id) => ({ serverId: id, mount: () => (log.push(`mount ${id}`), () => log.push(`unmount ${id}`)) });
const releaseA = registerHost(inst("A"));
const releaseB = registerHost(inst("B"));
assert.deepEqual(log, ["mount A"]); // only one overlay
assert.equal(globalThis.__paseoFloatingPanelHosts.hostKey, "A\nB");
releaseA();
assert.deepEqual(log, ["mount A", "unmount A", "mount B"]); // handoff
assert.equal(globalThis.__paseoFloatingPanelHosts.hostKey, "B");
releaseA(); // idempotent
releaseB();
assert.deepEqual(log.at(-1), "unmount B");
assert.equal(globalThis.__paseoFloatingPanelHosts.hostKey, "");
console.log("ok");
