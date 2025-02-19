import { ActionPanel, Action, Icon, Detail, Color } from "@raycast/api";
import { HarmonyError } from "../../types/core/errors";
import { ErrorCategory, ErrorRecoveryAction } from "../../types/core/harmony";
import { memo } from "react";

interface FeedbackStateProps {
  title: string;
  description?: string;
  icon?: Icon | { source: string };
  color?: string;
  actions?: React.ReactNode;
  error?: HarmonyError;
  onRetry?: () => void;
  onReconnect?: () => void;
  onClearCache?: () => void;
  onResetConfig?: () => void;
}

function getErrorColor(category: ErrorCategory): Color {
  switch (category) {
    case ErrorCategory.CONNECTION:
    case ErrorCategory.HUB_COMMUNICATION:
      return Color.Red;
    case ErrorCategory.DISCOVERY:
    case ErrorCategory.DATA:
      return Color.Orange;
    case ErrorCategory.COMMAND:
    case ErrorCategory.STATE:
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function getErrorIcon(category: ErrorCategory): Icon {
  switch (category) {
    case ErrorCategory.CONNECTION:
    case ErrorCategory.HUB_COMMUNICATION:
      return Icon.WifiDisabled;
    case ErrorCategory.DISCOVERY:
      return Icon.MagnifyingGlass;
    case ErrorCategory.COMMAND:
      return Icon.ExclamationMark;
    case ErrorCategory.STATE:
      return Icon.Warning;
    case ErrorCategory.DATA:
      return Icon.XMarkCircle;
    default:
      return Icon.ExclamationMark;
  }
}

function getRecoverySteps(error: HarmonyError): string[] {
  const steps: string[] = [];
  const actions = ErrorRecoveryAction;

  switch (error.category) {
    case ErrorCategory.CONNECTION:
    case ErrorCategory.HUB_COMMUNICATION:
      steps.push(
        "1. Check your network connection",
        "2. Verify the Harmony Hub is powered on",
        "3. Try reconnecting to the hub",
        "4. If issues persist, restart your hub"
      );
      break;
    case ErrorCategory.DISCOVERY:
      steps.push(
        "1. Ensure your hub is on the same network",
        "2. Check your firewall settings",
        "3. Try clearing the cache",
        "4. Attempt manual hub discovery"
      );
      break;
    case ErrorCategory.COMMAND:
      steps.push(
        "1. Wait a moment and try again",
        "2. Check if the device is powered on",
        "3. Verify the hub can control the device",
        "4. Try reconnecting to the hub"
      );
      break;
    case ErrorCategory.STATE:
      steps.push(
        "1. Try reconnecting to the hub",
        "2. Clear the local cache",
        "3. Reset the configuration",
        "4. If issues persist, restart the hub"
      );
      break;
    case ErrorCategory.DATA:
      steps.push(
        "1. Try refreshing the data",
        "2. Clear the local cache",
        "3. Reconnect to the hub",
        "4. Check hub connectivity"
      );
      break;
    default:
      steps.push(
        "1. Try the operation again",
        "2. Check hub connectivity",
        "3. Clear the local cache",
        "4. Contact support if issues persist"
      );
  }

  return steps;
}

function FeedbackStateImpl({
  title,
  description,
  icon,
  color,
  actions,
  error,
  onRetry,
  onReconnect,
  onClearCache,
  onResetConfig,
}: FeedbackStateProps) {
  const errorIcon = error ? getErrorIcon(error.category) : icon;
  const errorColor = error ? getErrorColor(error.category) : color;
  const recoverySteps = error ? getRecoverySteps(error) : [];

  const defaultActions = (
    <ActionPanel>
      {onRetry && (
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          onAction={onRetry}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      )}
      {onReconnect && (
        <Action
          title="Reconnect"
          icon={Icon.Link}
          onAction={onReconnect}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      )}
      {onClearCache && (
        <Action
          title="Clear Cache"
          icon={Icon.Trash}
          onAction={onClearCache}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />
      )}
      {onResetConfig && (
        <Action
          title="Reset Configuration"
          icon={Icon.Gear}
          onAction={onResetConfig}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        />
      )}
      {actions}
    </ActionPanel>
  );

  const markdown = `
# ${title}
${description ? `\n${description}` : ""}
${error ? `
## Error Details
\`\`\`
${error.getUserMessage()}
${error.message}
\`\`\`

## Troubleshooting Steps
${recoverySteps.join("\n")}

## Technical Details
- **Category**: ${error.category}
- **Error**: ${error.getDetailedMessage()}
${error.cause ? `- **Cause**: ${error.cause.message}` : ""}
` : ""}
  `.trim();

  return (
    <Detail
      markdown={markdown}
      navigationTitle={title}
      metadata={
        error
          ? <Detail.Metadata>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={error.category}
                  color={errorColor}
                  icon={errorIcon}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Error Message"
                text={error.getUserMessage()}
                icon={Icon.ExclamationMark}
              />
              <Detail.Metadata.Label
                title="Details"
                text={error.getDetailedMessage()}
              />
              {error.cause && (
                <Detail.Metadata.Label
                  title="Root Cause"
                  text={error.cause.message}
                  icon={Icon.Bug}
                />
              )}
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Available Actions">
                {onRetry && (
                  <Detail.Metadata.TagList.Item text="Retry" color={Color.Blue} />
                )}
                {onReconnect && (
                  <Detail.Metadata.TagList.Item text="Reconnect" color={Color.Green} />
                )}
                {onClearCache && (
                  <Detail.Metadata.TagList.Item text="Clear Cache" color={Color.Yellow} />
                )}
                {onResetConfig && (
                  <Detail.Metadata.TagList.Item text="Reset Config" color={Color.Red} />
                )}
              </Detail.Metadata.TagList>
            </Detail.Metadata>
          : undefined
      }
      actions={defaultActions}
    />
  );
}

export const FeedbackState = memo(FeedbackStateImpl); 