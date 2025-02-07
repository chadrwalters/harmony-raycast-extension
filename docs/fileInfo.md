# Harmony Raycast Extension File Structure

## Root Directory

### Configuration Files

#### `/package.json`
**Purpose**: Node.js project configuration, dependencies, and Raycast extension metadata.
**Status**: Essential, correctly placed.

#### `/package-lock.json`
**Purpose**: Locked versions of npm dependencies for consistent installations.
**Status**: Essential, correctly placed.

#### `/tsconfig.json`
**Purpose**: TypeScript configuration for the project.
**Status**: Essential, correctly placed.

### Documentation

#### `/README.md`
**Purpose**: Project overview, setup instructions, and usage documentation.
**Status**: Essential, correctly placed.

#### `/docs/architecture.md`
**Purpose**: Technical documentation of the extension's architecture.
**Status**: Essential, correctly placed.

#### `/docs/fileInfo.md`
**Purpose**: This file - comprehensive documentation of the codebase structure.
**Status**: Essential, correctly placed.

### Assets

#### `/assets/command-icon.png`
**Purpose**: Icon displayed for the extension's commands in Raycast.
**Status**: Essential, correctly placed.

#### `/assets/extension-icon.png`
**Purpose**: Main icon for the extension in Raycast's store.
**Status**: Essential, correctly placed.

## Source Code (`/src`)

### Entry Points

#### `/src/control.tsx`
**Purpose**: Main entry point for the extension's control command. Handles the primary UI and command registration.
**Status**: Essential, correctly placed.

#### `/src/harmony.ts`
**Purpose**: Main entry point for the extension's harmony functionality. Exports core harmony-related functions.
**Status**: Essential, correctly placed.

### Core Module (`/src/core`)

#### Harmony Integration (`/src/core/harmony/`)

##### `/src/core/harmony/harmony.ts`
**Purpose**: Core harmony hub interaction logic and state management.
**Status**: Essential, correctly placed.

##### `/src/core/harmony/harmonyClient.ts`
**Purpose**: Harmony Hub client implementation. Handles device communication and command execution.
**Status**: Essential, correctly placed.

##### `/src/core/harmony/harmonyMachine.ts`
**Purpose**: State machine for managing Harmony Hub connection states and transitions.
**Status**: Essential, correctly placed.

##### `/src/core/harmony/harmonyWebSocket.ts`
**Purpose**: WebSocket implementation for real-time communication with Harmony Hub.
**Status**: Essential, correctly placed.

#### Logging (`/src/core/logging/`)

##### `/src/core/logging/errorHandler.ts`
**Purpose**: Centralized error handling and error message formatting.
**Status**: Essential, correctly placed.

##### `/src/core/logging/logger.ts`
**Purpose**: Logging utility for debugging and monitoring.
**Status**: Essential, correctly placed.

#### Network (`/src/core/network/`)

##### `/src/core/network/network-retry.ts`
**Purpose**: Network retry logic with backoff for resilient connections.
**Status**: Essential, correctly placed.

#### Session Management (`/src/core/session/`)

##### `/src/core/session/session-manager.ts`
**Purpose**: Manages user session state and persistence.
**Status**: Essential, correctly placed.

#### Storage (`/src/core/storage/`)

##### `/src/core/storage/secure-storage.ts`
**Purpose**: Secure storage implementation for sensitive data.
**Status**: Essential, correctly placed.

#### Types (`/src/core/types/`)

##### `/src/core/types/error.ts`
**Purpose**: Type definitions for error handling.
**Status**: Essential, correctly placed.

#### UI (`/src/core/ui/`)

##### `/src/core/ui/toast-manager.ts`
**Purpose**: Manages toast notifications for user feedback.
**Status**: Essential, correctly placed.

#### Utils (`/src/core/utils/`)

##### `/src/core/utils/performance.ts`
**Purpose**: Performance monitoring and optimization utilities.
**Status**: Essential, correctly placed.

##### `/src/core/utils/validator.ts`
**Purpose**: Input validation utilities.
**Status**: Essential, correctly placed.

### Features Module (`/src/features`)

#### Control Feature (`/src/features/control/`)

##### Components (`/src/features/control/components/`)

###### `/src/features/control/components/DeviceList.tsx`
**Purpose**: React component for displaying and managing Harmony devices.
**Status**: Essential, correctly placed.

###### `/src/features/control/components/HarmonyCommand.tsx`
**Purpose**: React component for individual Harmony commands.
**Status**: Essential, correctly placed.

##### Context (`/src/features/control/context/`)

###### `/src/features/control/context/HarmonyContext.tsx`
**Purpose**: React context for sharing Harmony state across components.
**Status**: Essential, correctly placed.

##### Types (`/src/features/control/types/`)

###### `/src/features/control/types/harmony.ts`
**Purpose**: Type definitions for control-specific features.
**Status**: Essential, correctly placed.

#### Shared Features (`/src/features/shared/`)

##### Components (`/src/features/shared/components/`)

###### `/src/features/shared/components/FeedbackState.tsx`
**Purpose**: Shared component for displaying feedback states (loading, error, etc.).
**Status**: Essential, correctly placed.

## Project Organization

### Key Principles
1. **Feature-Based Structure**: Features are organized in self-contained modules under `/src/features/`
2. **Core Services**: Common functionality is centralized in `/src/core/`
3. **Shared Components**: Reusable UI components are placed in `/src/features/shared/`
4. **Type Safety**: TypeScript types are maintained close to their related features

### File Organization Best Practices
1. **Component Co-location**: Components are kept close to their related files
2. **Clear Module Boundaries**: Each module has clear responsibilities
3. **Consistent Naming**: Files follow consistent naming conventions
4. **Logical Grouping**: Related files are grouped in appropriate directories

## Recommendations

1. **Documentation**
   - Consider adding JSDoc comments to all exported functions and types
   - Add README files in major directories explaining their purpose

2. **Testing**
   - Consider adding a `/tests` directory
   - Implement unit tests for core functionality
   - Add integration tests for device communication

3. **Future Improvements**
   - Consider adding error boundary components
   - Implement telemetry for better error tracking
   - Add performance monitoring
