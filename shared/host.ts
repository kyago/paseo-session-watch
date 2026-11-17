import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** serverId of the daemon this plugin is installed on (same value as the app route /h/<serverId>/…). */
export const hostIdRpc = defineRpc({
  name: "host.id",
  input: z.object({}),
  output: z.object({ serverId: z.string().min(1) }),
});
