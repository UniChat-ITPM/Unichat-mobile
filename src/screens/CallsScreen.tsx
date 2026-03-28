import React from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CallsMainView, { CallLogEntry } from "../components/calls/CallsMainView";
import { colors } from "../theme/colors";

const DEMO_RECENT: CallLogEntry[] = [
  {
    id: "1",
    name: "Dewruwan Edirisinghe",
    direction: "incoming",
    timeLabel: "Yesterday",
    streakCount: 2,
    avatarColor: "#E0E7FF",
  },
  {
    id: "2",
    name: "Chuty",
    direction: "outgoing",
    isVideo: true,
    timeLabel: "17:10",
    avatarColor: "#FCE7F3",
  },
  {
    id: "3",
    name: "Kasun Perera",
    direction: "incoming",
    timeLabel: "16:02",
    avatarColor: "#DBEAFE",
  },
  {
    id: "4",
    name: "Amaya",
    direction: "outgoing",
    timeLabel: "Wed",
    avatarColor: "#E0F2FE",
  },
  {
    id: "5",
    name: "Uni Study Group",
    direction: "incoming",
    isVideo: true,
    timeLabel: "12 Mar",
    avatarColor: "#DDD6FE",
  },
];

const CallsScreen = ({
  navigation,
}: {
  navigation: { goBack: () => void; canGoBack: () => boolean };
}) => {
  const showBack = navigation.canGoBack();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <CallsMainView
        recentCalls={DEMO_RECENT}
        shortcutContact={{
          id: "shortcut-1",
          name: "Chuty",
          avatarColor: "#FBCFE8",
        }}
        onBack={showBack ? () => navigation.goBack() : undefined}
        onMore={() =>
          Alert.alert(
            "More options",
            "Additional call settings will appear here.",
          )
        }
        onNewCall={() =>
          Alert.alert("New call", "Pick a contact to call (demo).")
        }
        onQuickAction={(key) =>
          Alert.alert(
            "Quick action",
            key === "call"
              ? "Start a voice call (demo)."
              : key === "schedule"
                ? "Schedule a call (demo)."
                : key === "keypad"
                  ? "Open dial pad (demo)."
                  : "Favorite contacts (demo).",
          )
        }
        onShortcutContact={() =>
          Alert.alert("Chuty", "Open shortcut contact (demo).")
        }
        onCallInfo={(entry) =>
          Alert.alert(entry.name, "View call history details (demo).")
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});

export default CallsScreen;
