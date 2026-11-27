import { type PluginWorkspaceRowBadgeItemProps, useAgents, useTranslation, useWorkspace } from "@getpaseo/plugin/client";
import { WorkspaceRowBadge } from "@getpaseo/plugin/client/ui";
import { useRef } from "react";
import { View } from "react-native";
import { leaveWorkspace, showWorkspace } from "./workspace-popover";
import { hoverProps } from "./web";
import { text } from "./text";

/** Session counts on a workspace's sidebar row; hovering them lists the workspace's sessions beside the sidebar. */
export function WorkspaceSessionsBadge({ workspaceId }: PluginWorkspaceRowBadgeItemProps) {
  const { t } = useTranslation(text);
  const name = useWorkspace(workspaceId, (workspace) => workspace.name);
  const ref = useRef<View>(null);
  // Paseo's own agent store, the one its sidebar reads, so counts change when the sidebar does.
  // Background helpers have no tab and are left out. Workspace ids are random per host (wks_…).
  const total = useAgents({ where: (agent) => agent.workspaceId === workspaceId && !agent.background }).length;
  const running = useAgents({
    where: (agent) => agent.workspaceId === workspaceId && !agent.background && agent.status === "running",
  }).length;
  const needsInput = useAgents({
    where: (agent) => agent.workspaceId === workspaceId && !agent.background && agent.attentionReason === "permission",
  }).length;
  if (!total) return null;
  const open = () =>
    ref.current?.measureInWindow((x, y, width, height) =>
      showWorkspace({ id: workspaceId, name: name ?? "", anchor: { x, y, width, height } }, ref.current),
    );
  return (
    <View ref={ref} style={{ flexDirection: "row", gap: 6 }} {...hoverProps(open, leaveWorkspace)}>
      <WorkspaceRowBadge
        icon="MessagesSquare"
        label={String(total)}
        accessibilityLabel={t("workspaceSessions", { n: total })}
      />
      {running ? (
        <WorkspaceRowBadge icon="Loader" tone="info" label={String(running)} accessibilityLabel={t("running", { n: running })} />
      ) : null}
      {needsInput ? (
        <WorkspaceRowBadge
          icon="CircleAlert"
          tone="warning"
          label={String(needsInput)}
          accessibilityLabel={t("needsInput", { n: needsInput })}
        />
      ) : null}
    </View>
  );
}
