import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { AgentBoard, type BoardItem, PermissionRow, useAgentBoard } from "./agents";
import { usePalette } from "./palette";
import { hoverIn, hoverOut, setPopover, togglePinned, usePopover } from "./popover";
import { hoverProps, openAgentRoute } from "./web";
import { t } from "./text";

const PANEL = { width: 360, height: 480 };
const CARD_WIDTH = 340;
const MAX_CARDS = 3;
const MIN_WINDOW_WIDTH = 768;
const GAP = 8;
// Clears Paseo's window header, whose right end holds its own buttons.
const CARDS_TOP = 56;

const card = (colors: ReturnType<typeof usePalette>) => ({
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  overflow: "hidden" as const,
});

/** The session list beside the sidebar row: shown while hovered, or always when pinned. */
function SessionPopover({ items }: { items: BoardItem[] }) {
  const { height } = useWindowDimensions();
  const colors = usePalette();
  const { anchor, hover, pinned } = usePopover();
  if (!anchor || !(hover || pinned)) return null;
  const panelHeight = Math.min(PANEL.height, height - GAP * 2);
  return (
    <View
      {...hoverProps(hoverIn, hoverOut)}
      style={[
        card(colors),
        {
          position: "absolute",
          left: anchor.x + anchor.width + GAP,
          top: Math.max(GAP, Math.min(anchor.y, height - panelHeight - GAP)),
          width: PANEL.width,
          height: panelHeight,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          height: 40,
          backgroundColor: colors.raised,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ flex: 1, color: colors.foreground, fontWeight: "600" }}>{t("sessions")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(pinned ? "unpinLabel" : "pinLabel")}
          onPress={togglePinned}
          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
        >
          <Text style={{ color: pinned ? colors.accent : colors.muted, fontSize: 12 }}>
            {t(pinned ? "unpin" : "pin")}
          </Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <AgentBoard items={items} />
      </View>
    </View>
  );
}

/** One card per session waiting on the user, top-right, until it is answered. */
function ApprovalCards({ items }: { items: BoardItem[] }) {
  const colors = usePalette();
  // Requests the user already went to the session for; the card would only cover the session's own prompt.
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const requestIds = ({ agent }: BoardItem) =>
    agent.pendingPermissions.length ? agent.pendingPermissions.map((permission) => permission.id) : [agent.id];
  const waiting = items.filter(
    (item) => item.bucket === "needs_input" && !requestIds(item).every((id) => visited.has(id)),
  );
  if (!waiting.length) return null;
  const showHost = new Set(items.map((item) => item.serverId)).size > 1;
  return (
    <View style={{ position: "absolute", top: CARDS_TOP, right: 16, width: CARD_WIDTH, gap: GAP }}>
      {waiting.slice(0, MAX_CARDS).map((item) => {
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
          {agent.pendingPermissions.map((permission) => (
            <PermissionRow key={permission.id} serverId={serverId} agent={agent} permission={permission} />
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
      <ApprovalCards items={items} />
    </>
  );
}

/** Its own React root, outside Paseo's providers: plugin hooks such as usePaseo() are unavailable here. */
export function FloatingRoot() {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        <Content />
      </View>
    </QueryClientProvider>
  );
}
