import { List, Icon, Color } from "@raycast/api";
import React from "react";

/**
 * Props for the FeedbackState component.
 */
export interface FeedbackStateProps {
  /** The title to display */
  title: string;
  /** Optional description text */
  description?: string;
  /** The icon to display */
  icon?: Icon | { source: string };
  /** The color of the icon */
  color?: Color;
  /** Optional actions to display */
  actions?: React.ReactNode;
}

/**
 * FeedbackState component displays various application states with consistent styling.
 * Used for showing loading, error, and empty states throughout the application.
 *
 * @example
 * ```tsx
 * <FeedbackState
 *   title="No Devices Found"
 *   description="Please check your network connection"
 *   icon={Icon.Circle}
 * />
 * ```
 */
export function FeedbackState({ title, description, icon, color = Color.PrimaryText, actions }: FeedbackStateProps) {
  const iconSource = typeof icon === 'string' ? icon : (icon as Icon)?.source || Icon.Circle;
  
  return (
    <List>
      <List.EmptyView
        icon={{ source: iconSource, tintColor: color }}
        title={title}
        description={description}
        actions={actions}
      />
    </List>
  );
}

/**
 * Possible loading states for feedback display.
 */
export const LoadingStates = {
  DISCOVERING: {
    title: "Discovering Harmony Hubs...",
    description: "Searching your network for Harmony Hubs",
    icon: Icon.MagnifyingGlass,
  },
  CONNECTING: {
    title: "Connecting to Hub...",
    description: "Establishing connection to your Harmony Hub",
    icon: Icon.Link,
  },
  LOADING_ACTIVITIES: {
    title: "Loading Activities...",
    description: "Fetching available activities from your Hub",
    icon: Icon.List,
  },
  LOADING_DEVICES: {
    title: "Loading Devices...",
    description: "Fetching connected devices and their commands",
    icon: Icon.Devices,
  },
  EXECUTING_COMMAND: {
    title: "Executing Command...",
    description: "Sending command to your device",
    icon: Icon.Play,
  },
} as const;

/**
 * Possible error states for feedback display.
 */
export const ErrorStates = {
  NO_HUBS_FOUND: {
    title: "No Harmony Hubs Found",
    description: "Make sure your Harmony Hub is:\n• Powered on\n• Connected to WiFi\n• On the same network",
    icon: Icon.WifiDisabled,
    color: Color.Red,
  },
  CONNECTION_FAILED: {
    title: "Connection Failed",
    description:
      "Unable to connect to your Harmony Hub. Try:\n• Checking your network connection\n• Restarting your Hub\n• Verifying Hub's IP address",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  COMMAND_FAILED: {
    title: "Command Failed",
    description:
      "Failed to execute the command. Try:\n• Checking device power\n• Verifying IR line of sight\n• Retrying the command",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
  GENERAL_ERROR: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again or contact support if the issue persists.",
    icon: Icon.ExclamationMark,
    color: Color.Red,
  },
} as const;

// Type for loading states
export type LoadingState = keyof typeof LoadingStates;

// Type for error states
export type ErrorState = keyof typeof ErrorStates;
