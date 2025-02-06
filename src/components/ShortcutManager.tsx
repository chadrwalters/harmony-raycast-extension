import React, { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { ErrorHandler } from "../lib/errorHandler";
import { ErrorCategory } from "../types/error";
import { SecureStorage } from "../lib/secureStorage";
import { useHarmony } from "../hooks/useHarmony";
import { HarmonyManager } from "../lib/harmonyClient";
import { ToastManager } from "../lib/toastManager";

interface Shortcut {
  id: string;
  label: string;
  hubId: string;
  deviceId: string;
  commandId: string;
  shortcut?: {
    key: string;
    modifiers: string[];
  };
}

interface State {
  shortcuts: Shortcut[];
  isLoading: boolean;
  error: Error | null;
}

interface ShortcutManagerProps {
  initialShortcut?: {
    hubId: string;
    deviceId: string;
    commandId: string;
    label: string;
  };
}

export default function ShortcutManager({ initialShortcut }: ShortcutManagerProps) {
  const { state: harmonyState, executeCommand } = useHarmony();
  const [state, setState] = useState<State>({
    shortcuts: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    loadShortcuts();
  }, []);

  useEffect(() => {
    if (initialShortcut) {
      handleCreateShortcut(
        initialShortcut.hubId,
        initialShortcut.deviceId,
        initialShortcut.commandId,
        initialShortcut.label
      );
    }
  }, [initialShortcut]);

  const loadShortcuts = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const shortcuts = await SecureStorage.getShortcuts();
      setState((prev) => ({
        ...prev,
        shortcuts,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  const handleCreateShortcut = async (hubId: string, deviceId: string, commandId: string, label: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const newShortcut: Shortcut = {
        id: Date.now().toString(),
        label,
        hubId,
        deviceId,
        commandId,
      };
      const updatedShortcuts = [...state.shortcuts, newShortcut];
      await SecureStorage.saveShortcuts(updatedShortcuts);
      setState((prev) => ({
        ...prev,
        shortcuts: updatedShortcuts,
        isLoading: false,
      }));
      await showToast({
        style: Toast.Style.Success,
        title: "Shortcut Created",
        message: `Created shortcut for ${label}`,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  const handleDeleteShortcut = async (shortcut: Shortcut) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const updatedShortcuts = state.shortcuts.filter((s) => s.id !== shortcut.id);
      await SecureStorage.saveShortcuts(updatedShortcuts);
      setState((prev) => ({
        ...prev,
        shortcuts: updatedShortcuts,
        isLoading: false,
      }));
      await showToast({
        style: Toast.Style.Success,
        title: "Shortcut Deleted",
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
    }
  };

  const handleExecuteShortcut = async (shortcut: Shortcut) => {
    try {
      console.log('Executing shortcut:', shortcut); // Debug log

      // First connect to the hub
      const manager = HarmonyManager.getInstance();
      const cachedData = await manager.loadCachedHubData();
      if (cachedData && cachedData.hub.id === shortcut.hubId) {
        await manager.connect(cachedData.hub);
      } else {
        throw new Error("Could not find hub in cache. Please run a regular command first to establish connection.");
      }

      await ToastManager.progressWithSteps([
        "Preparing Command...",
        "Executing Command...",
        `${shortcut.label} Completed`,
      ]);
      await executeCommand(shortcut.deviceId, shortcut.commandId);
      await showToast({
        style: Toast.Style.Success,
        title: "Command Executed",
        message: shortcut.label,
      });
    } catch (error) {
      console.error('Error executing shortcut:', error); // Debug log
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not run command",
        message: error instanceof Error ? error.message : String(error),
      });
      await ErrorHandler.handleError(error as Error, ErrorCategory.COMMAND_EXECUTION);
    }
  };

  if (state.error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark }}
          title="Error Occurred"
          description={state.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={loadShortcuts} icon={{ source: Icon.ArrowClockwise }} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state.isLoading) {
    return (
      <List>
        <List.EmptyView icon={{ source: Icon.CircleProgress }} title="Loading Shortcuts..." />
      </List>
    );
  }

  return (
    <List isLoading={state.isLoading}>
      {state.shortcuts.length === 0 ? (
        <List.EmptyView icon={{ source: Icon.List }} title="No Shortcuts" description="Add a shortcut to get started" />
      ) : (
        state.shortcuts.map((shortcut) => (
          <List.Item
            key={shortcut.id}
            title={shortcut.label}
            subtitle={shortcut.shortcut ? `⌘${shortcut.shortcut.key}` : "No shortcut assigned"}
            icon={Icon.Keyboard}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Execute Command"
                    icon={Icon.Terminal}
                    onAction={() => handleExecuteShortcut(shortcut)}
                  />
                  <Action
                    title="Delete Shortcut"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteShortcut(shortcut)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
      <ActionPanel>
        <Action
          title="Add Shortcut"
          onAction={() =>
            handleCreateShortcut("hubId", "deviceId", "commandId", "Label")
          }
          icon={{ source: Icon.Plus }}
        />
      </ActionPanel>
    </List>
  );
}
