```markdown
# Harmony Control for Raycast

Harmony Control is a Raycast extension that allows you to control your Logitech Harmony Hub devices directly from Raycast. It provides a fast and efficient interface for managing your home entertainment system.

## Quick Start

### Installation

1.  Open Raycast.
2.  Search for "Harmony Control".
3.  Click Install.

### Usage

1.  Launch the extension by typing "Harmony Control" in Raycast.
2.  The extension will automatically discover Harmony Hubs on your local network.
3.  Select your hub from the list.
4.  Browse and control your devices and activities.

## Configuration

You can configure the extension in Raycast's preferences:

*   **Default View:** Choose whether to show "Activities" or "Devices" by default.
*   **Command Hold Time:** Adjust the duration (in milliseconds) to hold a command. Default is 100ms.
*   **Cache Duration:**  Set how long hub data is cached (in seconds). Default is 3600 seconds (1 hour).
*   **Debug Logging:** Enable or disable debug logging. Default is true.
*   **Network Timeout:**  Set the network request timeout (in milliseconds). Default is 5000ms.
* **Auto Retry:** Enable/Disable automatic retries for failed operations. Defaults to true
* **Max Retries**: Maximum number of times to retry. Defaults to 3.

## Features

### Device Control

*   Browse all configured devices.
*   Execute device-specific commands (e.g., power, volume, input).

### Activity Management

*   Start and stop Harmony activities.
*   View the current activity status.

### Hub Discovery
* Automatically detects hubs on the local network

### Other
* Refresh the current connection.
* Clear cache and re-discover hubs.

## Troubleshooting
* Ensure your Hub and Mac are on the same network.
* Make sure the Hub is powered on and connected to your Wi-Fi.
* Check your firewall settings and unblock ports required by Harmony.
* Verify that the hub has a direct line of sight to IR-controlled devices.

## Dependencies

*   `@harmonyhub/client-ws`:  Harmony Hub client library.
*   `@harmonyhub/discover`:  Harmony Hub discovery library.
*   `@raycast/api`: Raycast API library.
*   `@raycast/utils`: Raycast utilities.
*   `ws`: WebSocket library.

## Public Interfaces and Features

The extension's main functionalities are organized around React components, custom hooks, and services. Here's a breakdown:

### `src/control.tsx`

This is the main entry point for the extension. It renders the `HarmonyCommand` component wrapped in a `HarmonyProvider`.

### Components (`src/components/`)

#### `DeviceList.tsx`

Displays a searchable list of Harmony devices and their commands.

*   **Props:**
    *   `deviceType?: string`: (Optional) Filters the list to a specific device type.

*   **Features:**
    *   Lists devices, showing their name, type, and number of commands.
    *   Provides a search bar to filter devices and commands.
    *   Allows execution of commands via an `ActionPanel`.

#### `ErrorBoundary.tsx`

A standard React error boundary component that catches and displays errors.

*   **Props:**
    *   `children: React.ReactNode`: The child components to wrap.

*   **Features:**
    *   Catches errors in its child component tree.
    *   Displays a generic error message.
    *   Logs errors for debugging.

#### `FeedbackState.tsx`

Displays loading, error, and empty states.

*   **Props:**
    *   `title: string`: The title to display.
    *   `description?: string`: Optional description.
    *   `icon?: Icon | { source: string }`: The icon.
    *   `color?: Color`: Icon color.
    *   `actions?: React.ReactNode`: Optional actions.
    *   `error?: HarmonyError`: Optional error object.
    *   `onRetry?: () => void`: Optional retry callback.
    * `onReconnect?: () => void`: Optional reconnect callback.
    * `onClearCache?: () => void`: Optional clear-cache callback.
    * `onResetConfig?: () => void`: Optional config-reset callback.
*   **Features:**
    *   Provides consistent UI for different states.
    *   Supports displaying error details and recovery actions.

#### `HarmonyCommand.tsx`

Provides a unified interface to control devices and activities.

*   **Features:**
    *   Displays a list of hubs, activities, or devices based on the selected view.
    *   Supports searching and filtering.
    *   Allows execution of commands and starting/stopping activities.
    *   Handles hub selection and connection.
    * Handles switching view between hubs, activities, devices, and individual commands.

### Hooks (`src/hooks/`)

#### `useHarmony.ts`

The main hook for managing Harmony Hub state and operations. Provides a context that is used by other components.

*   **Returned Values:**
    *   `hubs: HarmonyHub[]`: List of discovered hubs.
    *   `selectedHub: HarmonyHub | null`: The currently selected hub.
    *   `devices: HarmonyDevice[]`: List of devices for the selected hub.
    *   `activities: HarmonyActivity[]`: List of activities for the selected hub.
    *   `currentActivity: HarmonyActivity | null`: The currently active activity.
    *   `error: HarmonyError | null`: Any current error.
    *   `loadingState: LoadingState`: The current loading state.
    *   `connect: (hub: HarmonyHub) => Promise<void>`: Connects to the specified hub.
    *   `disconnect: () => Promise<void>`: Disconnects from the current hub.
    *   `refresh: () => Promise<void>`: Refreshes the hub state.
    *   `executeCommand: (command: HarmonyCommand) => Promise<void>`: Executes a command.
    *   `clearCache: () => Promise<void>`: Clears the cache and rediscovers hubs.
    *   `startActivity: (activityId: string) => Promise<void>`: Starts an activity.
    *   `stopActivity: () => Promise<void>`: Stops the current activity.

### Services (`src/services/`)
#### `harmony/harmonyClient.ts`

Handles communication with a specific Harmony Hub.

*   **`HarmonyClient` Class:**
    *   `constructor(hub: HarmonyHub)`: Initializes a new client for the given hub.
    *   `connect(): Promise<void>`: Connects to the hub.
    *   `getDevices(): Promise<HarmonyDevice[]>`: Retrieves the list of devices.
    *   `getActivities(): Promise<HarmonyActivity[]>`: Retrieves the list of activities.
    *   `getCurrentActivity(): Promise<HarmonyActivity | null>`: Gets the current activity.
    *   `startActivity(activityId: string): Promise<void>`: Starts an activity.
    *   `stopActivity(): Promise<void>`: Stops the current activity.
    *   `executeCommand(command: HarmonyCommand): Promise<void>`: Executes a command.
    *   `disconnect(): Promise<void>`: Disconnects from the hub.

#### `harmony/harmonyManager.ts`

Manages discovery of Harmony Hubs.

* **`HarmonyManager` Class:**
  * `startDiscovery(onProgress?: (progress: number, message: string) => void): Promise<HarmonyHub[]>`: Starts the hub discovery process, with an optional progress callback.
  * `cleanup(): Promise<void>`: Cleans up discovery.
  *  `clearCache(): Promise<void>`: Clears the hub cache.

#### `harmony/commandQueue.ts`

Manages a queue of commands to be executed.

*   **`CommandQueue` Class:**
    *   `constructor(commandSender: CommandSender, config?: Partial<CommandQueueConfig>)`: Creates a new command queue. `CommandSender` is a function that takes a `HarmonyCommand` and sends it.
    *   `enqueue(request: CommandRequest): Promise<CommandResult>`: Adds a command to the queue.
    *  `cancelAll(): void`: Cancels all pending commands
    *  `clearCompleted(): void`: Clears completed commands.

#### `errorHandler.ts`

Provides consistent error handling.

*   **`ErrorHandler` Class:**
    *   `static handle(error: Error | unknown, context?: string): void`: Handles an error by logging and showing a toast.
    *   `static handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T>`: Handles errors in an async operation.

#### `localStorage.ts`

Provides a wrapper around Raycast's `LocalStorage` with error logging.

*   **`LocalStorage` Class:**
    *   `static getItem(key: string): Promise<string | null>`: Retrieves an item.
    *   `static setItem(key: string, value: string): Promise<void>`: Stores an item.
    *   `static removeItem(key: string): Promise<void>`: Removes an item.
    *   `static clear(): Promise<void>`: Clears all items.

#### `logger.ts`

Provides a logging mechanism.

*   **`Logger` Class:**
    *   `static debug(message: string, data?: unknown): void`: Logs a debug message.
    *   `static info(message: string, data?: unknown): void`: Logs an info message.
    *   `static warn(message: string, data?: unknown): void`: Logs a warning message.
    *   `static error(message: string, data?: unknown): void`: Logs an error message.
    *   `static logError(error: Error, context?: string): void`: Logs a full error with stack trace.

#### `secure-storage.ts`
Provides secure storage using encryption. (Currently not in use.)
#### `session-manager.ts`
Manages sessions. (Currently not in use.)

#### `ui/toast-manager.ts`

Helper class to wrap and simplify Raycast `showToast` calls.

*   **`ToastManager` Class:**
    *  `static success(title: string, message?: string): void`: Shows a success toast.
    *  `static error(title: string, message?: string): void`: Shows an error toast.
    *  `static loading(title: string, message?: string): void` Shows a loading toast.

#### `utils/validation.ts`

Provides validation functions.
*   `isNonEmptyString(value: unknown): value is string`: Check if a value is not an empty string.
*  `isPositiveNumber(value: unknown): value is number`: Checks if a value is a number > 0.
*   `isValidIpAddress(value: unknown): value is string`: Checks if a value is a valid IPv4 address.
*  `validateHubConfig(hub: Partial<HarmonyHub>): asserts hub is HarmonyHub`: Validates Hub configurations.
*  `validateDevice(device: Partial<HarmonyDevice>): asserts device is HarmonyDevice`: Validates Device information.
* `validateActivity(activity: Partial<HarmonyActivity>): asserts activity is HarmonyActivity`: Validates Activity information.
* `validateCommandRequest(request: Partial<CommandRequest>): asserts request is CommandRequest`: Validates requests.

### Types (`src/types/`)

This directory contains TypeScript type definitions for the project.  Key types include:

*   `harmony.ts`:  Defines core types like `HarmonyHub`, `HarmonyDevice`, `HarmonyActivity`, `HarmonyCommand`, and `LoadingState`.
*   `errors.ts`:  Defines `HarmonyError`, `ErrorCategory`, `ErrorSeverity`, and related error handling types.
*  `preferences.ts`: Defines the `Preferences` interface.
*   `logging.ts`: Defines types related to logging (`LogLevel`, `LogEntry`, etc.).
```
