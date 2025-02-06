import { useEffect } from "react";
import { List, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useHarmony } from "./hooks/useHarmony";
import ShortcutManager from "./components/ShortcutManager";

interface ShortcutLaunchProps extends LaunchProps {
  arguments: {
    hubId?: string;
    deviceId?: string;
    commandId?: string;
    label?: string;
  };
}

export default function Command(props: ShortcutLaunchProps) {
  const { state, loadCache } = useHarmony();
  const { hubId, deviceId, commandId, label } = props.arguments;

  useEffect(() => {
    loadCache("last_connected_hub").catch(console.error);
  }, [loadCache]);

  if (state.error) {
    return (
      <List>
        <List.EmptyView icon={{ source: "error.png" }} title="Error" description={state.error.message} />
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

  return <ShortcutManager initialShortcut={hubId && deviceId && commandId && label ? { hubId, deviceId, commandId, label } : undefined} />;
}
