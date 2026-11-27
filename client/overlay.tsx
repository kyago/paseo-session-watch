import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { AgentBoard, type BoardItem, PermissionRow, useAgentBoard } from "./agents";
import { usePalette } from "./palette";
import { getRow, hoverIn, hoverOut, setPopover, usePopover } from "./popover";
import { composerClearance, hoverProps, openAgentRoute, trackPointer } from "./web";
import { t } from "./text";
import {
  getWorkspaceRow,
  keepWorkspace,
  leaveWorkspace,
  moveWorkspaceAnchor,
  useWorkspacePopover,
} from "./workspace-popover";

const PANEL = { width: 340, maxHeight: 480 };
const CARET = 10;
// Where the caret sits from the panel's top when the panel is free to align with its anchor.
const CARET_OFFSET = 20;
const CARD_WIDTH = 340;
const MAX_CARDS = 3;
const MIN_WINDOW_WIDTH = 768;
const GAP = 8;
const EDGE = 16;

const card = (colors: ReturnType<typeof usePalette>) => ({
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  overflow: "hidden" as const,
});

/**
 * A floating panel beside a sidebar anchor: sized to its content up to a cap, with a caret pointing
 * at the anchor, so it reads as attached to the row rather than as a window of its own.
 */
function PopoverCard({
  panelRef,
  anchor,
  left,
  title,
  count,
  onEnter,
  onLeave,
  children,
}: {
  panelRef: React.RefObject<View | null>;
  anchor: { y: number; height: number };
  left: number;
  title: string;
  count: number;
  onEnter: () => void;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const colors = usePalette();
  const [panelHeight, setPanelHeight] = useState(0);
  const maxHeight = Math.min(PANEL.maxHeight, height - GAP * 2);
  const anchorMid = anchor.y + anchor.height / 2;
  const top = Math.max(GAP, Math.min(anchorMid - CARET_OFFSET, height - (panelHeight || maxHeight) - GAP));
  const caretTop = Math.max(CARET, Math.min(anchorMid - top, (panelHeight || maxHeight) - CARET)) - CARET / 2;
  return (
    <View
      ref={panelRef}
      {...hoverProps(onEnter, onLeave)}
      onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
      style={{
        position: "absolute",
        left,
        top,
        width: PANEL.width,
        maxHeight,
        borderRadius: 10,
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: -CARET / 2,
          top: caretTop,
          width: CARET,
          height: CARET,
          transform: [{ rotate: "45deg" }],
          backgroundColor: colors.surface,
          borderLeftWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      />
      <View style={[card(colors), { borderRadius: 10, maxHeight, flexShrink: 1 }]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{count}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

/** The session list beside the sidebar row, shown while the row or the list is hovered. */
function SessionPopover({ items }: { items: BoardItem[] }) {
  const { anchor, hover } = usePopover();
  const panel = useRef<View>(null);
  useEffect(() => {
    if (!hover) return;
    return trackPointer(getRow, () => panel.current, ({ row, inside }) => {
      // A row that is no longer on screen takes the list with it.
      setPopover({ anchor: row });
      if (inside) hoverIn();
      else hoverOut();
    });
  }, [hover]);
  if (!anchor || !hover) return null;
  return (
    <PopoverCard
      panelRef={panel}
      anchor={anchor}
      left={anchor.x + anchor.width + GAP}
      title={t("sessions")}
      count={items.filter((item) => item.bucket !== "done").length}
      onEnter={hoverIn}
      onLeave={hoverOut}
    >
      <AgentBoard items={items} />
    </PopoverCard>
  );
}

/** The hovered workspace's sessions, beside the sidebar at the badge's height. */
function WorkspacePopover({ items }: { items: BoardItem[] }) {
  const { workspace, hover } = useWorkspacePopover();
  const sessionsRow = usePopover().anchor;
  const panel = useRef<View>(null);
  const open = hover && !!workspace;
  useEffect(() => {
    if (!open) return;
    return trackPointer(getWorkspaceRow, () => panel.current, ({ row, inside }) => {
      moveWorkspaceAnchor(row);
      if (inside) keepWorkspace();
      else leaveWorkspace();
    });
  }, [open]);
  if (!open || !workspace) return null;
  const sessions = items.filter((item) => item.agent.workspaceId === workspace.id);
  const { anchor } = workspace;
  // The Sessions row spans the sidebar, so its right edge clears the whole sidebar; the badge alone does not.
  const left = Math.max(anchor.x + anchor.width, sessionsRow ? sessionsRow.x + sessionsRow.width : 0) + GAP;
  return (
    <PopoverCard
      panelRef={panel}
      anchor={anchor}
      left={left}
      title={workspace.name || t("sessions")}
      count={sessions.length}
      onEnter={keepWorkspace}
      onLeave={leaveWorkspace}
    >
      <AgentBoard items={sessions} />
    </PopoverCard>
  );
}

/** One card per session waiting on the user, bottom-right above the composer, until it is answered. */
function ApprovalCards({ items }: { items: BoardItem[] }) {
  const colors = usePalette();
  const { width } = useWindowDimensions();
  // Requests the user already went to the session for; the card would only cover the session's own prompt.
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const requestIds = ({ agent }: BoardItem) =>
    agent.pendingPermissions.length ? agent.pendingPermissions.map((permission) => permission.id) : [agent.id];
  const waiting = items.filter(
    (item) => item.bucket === "needs_input" && !requestIds(item).every((id) => visited.has(id)),
  );
  if (!waiting.length) return null;
  const showHost = new Set(items.map((item) => item.serverId)).size > 1;
  const bottom = Math.max(EDGE, composerClearance(width - EDGE - CARD_WIDTH) + GAP);
  return (
    <View style={{ position: "absolute", bottom, right: EDGE, width: CARD_WIDTH, gap: GAP }}>
      {waiting.slice(0, MAX_CARDS).map((item, index) => {
        const { agent, serverId, host, project } = item;
        return (
        <View
          key={`${serverId}:${agent.id}`}
          style={[
            card(colors),
            {
              padding: 10,
              borderLeftWidth: 3,
              borderLeftColor: colors.warning,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("openSession", { title: agent.title ?? t("untitled") })}
            onPress={() => {
              setVisited((current) => new Set([...current, ...requestIds(item)]));
              openAgentRoute(serverId, agent.id, agent.workspaceId);
            }}
          >
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
              {agent.title ?? t("untitled")}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>
              {showHost ? `${host} · ` : ""}
              {project} · {t("bucketNeedsInput")}
            </Text>
          </Pressable>
          {agent.pendingPermissions.map((permission, row) => (
            <PermissionRow
              key={permission.id}
              serverId={serverId}
              agent={agent}
              permission={permission}
              shortcuts={index === 0 && row === 0}
            />
          ))}
        </View>
        );
      })}
      {waiting.length > MAX_CARDS ? (
        <View style={[card(colors), { paddingVertical: 6, alignItems: "center" }]}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{t("more", { n: waiting.length - MAX_CARDS })}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Content() {
  const { width } = useWindowDimensions();
  const items = useAgentBoard();
  const running = items.filter((item) => item.bucket === "running").length;
  const needsInput = items.filter((item) => item.bucket === "needs_input").length;
  // The sidebar row shows these; it reads them from the store instead of subscribing a second time.
  useEffect(() => setPopover({ running, needsInput }), [running, needsInput]);
  if (width < MIN_WINDOW_WIDTH) return null;
  return (
    <>
      <SessionPopover items={items} />
      <WorkspacePopover items={items} />
      <ApprovalCards items={items} />
    </>
  );
}

/** Its own React root, outside Paseo's providers: plugin hooks such as usePaseo() are unavailable here. */
export function OverlayRoot() {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        <Content />
      </View>
    </QueryClientProvider>
  );
}
