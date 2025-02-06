import { useEffect } from "react";
import { List } from "@raycast/api";
import { useHarmony } from "./hooks/useHarmony";
import ShortcutManager from "./components/ShortcutManager";

export default function Command() {
  const { state, loadCache } = useHarmony();

  useEffect(() => {
    loadCache("last_connected_hub").catch(console.error);
  }, [loadCache]);

  if (state.error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "error.png" }}
          title="Error"
          description={state.error.message}
        />
      </List>
    );
  }

  if (!state.isConnected) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "disconnected.png" }}
          title="Not Connected"
          description="Connect to a Harmony Hub first"
        />
      </List>
    );
  }

  return <ShortcutManager />;
}
