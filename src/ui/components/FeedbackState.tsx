import { ActionPanel, Action, Icon, Detail, Color } from "@raycast/api";
import { memo } from "react";

import { HarmonyError } from "../../types/core/errors";
import { ErrorCategory, ErrorRecoveryAction } from "../../types/core/harmony";

interface FeedbackStateProps {
  title: string;
  description?: string;
  icon?: Icon | { source: string };
  color?: string;
  error?: HarmonyError;
  onRetry?: () => void;
  onReconnect?: () => void;
  onClearCache?: () => void;
  onResetConfig?: () => void;
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

  switch (error.category) {
    case ErrorCategory.CONNECTION:
    case ErrorCategory.HUB_COMMUNICATION:
      steps.push(
        "1. Check your network connection",
        "2. Verify the Harmony Hub is powered on",
        "3. Try reconnecting to the hub",
        "4. If issues persist, restart your hub",
      );
      break;
    case ErrorCategory.DISCOVERY:
      steps.push(
        "1. Ensure your hub is on the same network",
        "2. Check your firewall settings",
        "3. Try clearing the cache",
        "4. Attempt manual hub discovery",
      );
      break;
    case ErrorCategory.COMMAND:
      steps.push(
        "1. Wait a moment and try again",
        "2. Check if the device is powered on",
        "3. Verify the hub can control the device",
        "4. Try reconnecting to the hub",
      );
      break;
    case ErrorCategory.STATE:
      steps.push(
        "1. Try reconnecting to the hub",
        "2. Clear the local cache",
        "3. Reset the configuration",
        "4. If issues persist, restart the hub",
      );
      break;
    case ErrorCategory.DATA:
      steps.push(
        "1. Try refreshing the data",
        "2. Clear the local cache",
        "3. Reconnect to the hub",
        "4. Check hub connectivity",
      );
      break;
    default:
      steps.push(
        "1. Try the operation again",
        "2. Check hub connectivity",
        "3. Clear the local cache",
        "4. Contact support if issues persist",
      );
  }

  return steps;
}

function FeedbackStateImpl({
  title,
  description,
  icon,
  color,
  error,
  onRetry,
  onReconnect,
  onClearCache,
  onResetConfig,
}: FeedbackStateProps): JSX.Element {
  // If there's an error, show error-specific UI
  if (error) {
    const errorIcon = getErrorIcon(error.category);
    const recoverySteps = getRecoverySteps(error);
    const recoveryActions = error.getDefaultRecoveryStrategy()?.actions || [];

    return (
      <Detail
        markdown={`# ${title}\n\n${error.message}\n\n${
          recoverySteps.length > 0 ? "## Recovery Steps\n\n" + recoverySteps.join("\n\n") : ""
        }`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Category" text={error.category} icon={errorIcon} />
            <Detail.Metadata.Label title="Severity" text={error.severity} />
            {error.code && <Detail.Metadata.Label title="Code" text={error.code} />}
            {error.timestamp && (
              <Detail.Metadata.Label title="Time" text={new Date(error.timestamp).toLocaleTimeString()} />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            {recoveryActions.includes(ErrorRecoveryAction.RETRY) && onRetry && (
              <Action title="Retry" onAction={onRetry} icon={Icon.ArrowClockwise} />
            )}
            {recoveryActions.includes(ErrorRecoveryAction.RECONNECT) && onReconnect && (
              <Action title="Reconnect" onAction={onReconnect} icon={Icon.Link} />
            )}
            {recoveryActions.includes(ErrorRecoveryAction.CLEAR_CACHE) && onClearCache && (
              <Action title="Clear Cache" onAction={onClearCache} icon={Icon.Trash} />
            )}
            {recoveryActions.includes(ErrorRecoveryAction.RESET_CONFIG) && onResetConfig && (
              <Action title="Reset Configuration" onAction={onResetConfig} icon={Icon.Gear} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // Show standard feedback state
  return (
    <Detail
      markdown={`# ${title}${description ? `\n\n${description}` : ""}`}
      metadata={
        <Detail.Metadata>
          {icon && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="" icon={icon} color={color as Color} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

export const FeedbackState = memo(FeedbackStateImpl);
