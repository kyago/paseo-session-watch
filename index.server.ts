import type { PluginServerContext } from "@getpaseo/plugin/server";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { hostIdRpc } from "./shared/host";

const HOME = process.env.PASEO_HOME ?? join(homedir(), ".paseo");

export default function contribute(server: PluginServerContext) {
  // The daemon keeps its serverId in PASEO_HOME/server-id; the app routes hosts by the same value.
  server.handle(hostIdRpc, async () => ({
    serverId: (await readFile(join(HOME, "server-id"), "utf8")).trim(),
  }));
  return () => {};
}
