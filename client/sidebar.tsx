import { type PluginSidebarItemProps, useTranslation } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { hoverIn, hoverOut, setPopover, setRow, togglePinned, usePopover } from "./popover";
import { hoverProps } from "./web";
import { text } from "./text";

/** One sidebar row with live counts. Hover shows the session list beside it; a click pins it open. */
export function SessionsItem({ theme }: PluginSidebarItemProps) {
  const { running, needsInput, pinned } = usePopover();
  const { t } = useTranslation(text);
  const ref = useRef<View>(null);
  const measure = () =>
    ref.current?.measureInWindow((x, y, width, height) =>
      setPopover({ anchor: { x, y, width, height } }),
    );
  useEffect(() => {
    setRow(ref.current);
    return () => {
      setRow(null);
      setPopover({ anchor: null, hover: false });
    };
  }, []);
  return (
    <View
      ref={ref}
      onLayout={measure}
      {...hoverProps(() => {
        measure();
        hoverIn();
      }, hoverOut)}
    >
      <SidebarRow
        icon={pinned ? "Pin" : "Activity"}
        label={t("sessions")}
        active={pinned}
        onPress={() => {
          measure();
          togglePinned();
        }}
        trailing={
          <Text style={{ fontSize: 12, color: theme.colors.foregroundMuted }}>
            {t("running", { n: running })}
            {needsInput ? (
              <Text style={{ color: theme.colors.statusWarning }}> · {t("needsInput", { n: needsInput })}</Text>
            ) : null}
          </Text>
        }
      />
    </View>
  );
}
