import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Logger } from "./core/logging/logger";

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
  debugMode: true,
  autoRetry: true,
  maxRetries: "3",
};

const SETTINGS_KEY = "harmony_settings";
const logger = new Logger();

export default function Command() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      logger.error("Failed to load settings:", error);
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
      await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
      setSettings(values);
      logger.info("Settings saved successfully");
      await showToast({
        style: Toast.Style.Success,
        title: "Settings Saved",
        message: "Restart the extension for changes to take effect",
      });
    } catch (error) {
      logger.error("Failed to save settings:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Settings",
        message: String(error),
      });
    }
  };

  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      
      // Show progress toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing Cache...",
      });

      // Clear settings
      await LocalStorage.removeItem(SETTINGS_KEY);
      setSettings(DEFAULT_SETTINGS);
      
      logger.info("Cache and settings cleared successfully");
      await showToast({
        style: Toast.Style.Success,
        title: "Cache Cleared",
        message: "All cached data and settings have been reset to defaults",
      });
    } catch (error) {
      logger.error("Failed to clear cache:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Clear Cache",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
          <Action
            title="Clear Cache & Reset Settings"
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
