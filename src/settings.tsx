import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { useHarmony } from "./hooks/useHarmony";

interface Settings {
  cacheDuration: string;
  networkTimeout: string;
  debugMode: boolean;
  autoRetry: boolean;
  maxRetries: string;
}

const DEFAULT_SETTINGS: Settings = {
  cacheDuration: "24",
  networkTimeout: "5000",
  debugMode: false,
  autoRetry: true,
  maxRetries: "3",
};

export default function Command() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { clearCache } = useHarmony();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await LocalStorage.getItem<string>("harmony_settings");
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Settings",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: Settings) => {
    try {
      await LocalStorage.setItem("harmony_settings", JSON.stringify(values));
      setSettings(values);
      await showToast({
        style: Toast.Style.Success,
        title: "Settings Saved",
        message: "Restart the extension for changes to take effect",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Settings",
        message: String(error),
      });
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      await showToast({
        style: Toast.Style.Success,
        title: "Cache Cleared",
        message: "All cached data has been removed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Cache",
        message: String(error),
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
          <Action
            title="Clear Cache"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleClearCache}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Harmony Hub Settings"
        text="Configure your Harmony Hub extension settings. Some changes may require a restart to take effect."
      />

      <Form.Separator />

      <Form.TextField
        id="cacheDuration"
        title="Cache Duration"
        placeholder="24"
        info="How long to cache Hub data (in hours)"
        value={settings.cacheDuration}
        onChange={(value) => setSettings({ ...settings, cacheDuration: value })}
      />

      <Form.TextField
        id="networkTimeout"
        title="Network Timeout"
        placeholder="5000"
        info="Network request timeout (in milliseconds)"
        value={settings.networkTimeout}
        onChange={(value) => setSettings({ ...settings, networkTimeout: value })}
      />

      <Form.Separator />

      <Form.Checkbox
        id="debugMode"
        label="Debug Mode"
        info="Enable detailed logging for troubleshooting"
        value={settings.debugMode}
        onChange={(value) => setSettings({ ...settings, debugMode: value })}
      />

      <Form.Checkbox
        id="autoRetry"
        label="Auto Retry"
        info="Automatically retry failed operations"
        value={settings.autoRetry}
        onChange={(value) => setSettings({ ...settings, autoRetry: value })}
      />

      <Form.TextField
        id="maxRetries"
        title="Max Retries"
        placeholder="3"
        info="Maximum number of retry attempts"
        value={settings.maxRetries}
        onChange={(value) => setSettings({ ...settings, maxRetries: value })}
      />
    </Form>
  );
}
