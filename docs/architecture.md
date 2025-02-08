# Raycast Harmony Hub Extension Architecture

## Overview
This extension enables Raycast users to control their Logitech Harmony Hub devices directly from Raycast. It uses WebSocket communication to discover and control Harmony Hub devices on the local network.

## Core Dependencies
- `@harmonyhub/client-ws` (ISC License) - WebSocket client for Harmony Hub communication
- `@harmonyhub/discover` (ISC License) - Hub discovery on local network
- `@raycast/api` - Raycast extension API

## Architecture Components

### 1. Core Services

#### HarmonyManager (`src/core/harmony/harmonyClient.ts`)
- Singleton service for Harmony Hub interaction
- Handles device discovery and connection
- Manages command execution and state
- Implements caching for improved performance

#### Storage Services
- `SecureStorage`: Secure data persistence
- `SessionManager`: Session state management
- `ToastManager`: User notifications

### 2. Features

#### Control Feature (`src/features/control`)
- Main feature for device control
- React components for UI
- Custom hooks for state management
- TypeScript interfaces for type safety

#### Shared Components (`src/features/shared`)
- Reusable UI components
- Error boundaries
- Loading states
- Feedback components

### 3. State Management

#### Local Storage
- Hub connection details
- Device and activity cache
- User preferences

#### React State
- Current device state
- UI interaction state
- Error handling state

### 4. Caching System

#### Hub Data Cache
- Activities and devices cached
- 24-hour cache validity
- Automatic cache invalidation
- Cache refresh on demand

#### Performance Optimizations
- Lazy command loading
- Command validation and filtering
- Efficient data structures
- Memory management

### 5. Error Handling

The extension implements comprehensive error handling:
- Typed error categories
- Contextual error messages
- Automatic retry logic
- User-friendly notifications

### 6. Communication Flow

#### Device Discovery
1. Network scan for hubs
2. Hub validation
3. Connection establishment

#### Command Execution
1. Command validation
2. Device state check
3. Command dispatch
4. Status feedback

### 7. Security Considerations

- Secure credential storage
- Local network only
- Input validation
- Error sanitization

## File Structure Breakdown

### Source Directory (`src/`)

#### Core Directory (`src/core/`)
Contains core functionality and services.

##### Harmony Directory (`src/core/harmony/`)
- `harmonyClient.ts` - Singleton client for Harmony Hub communication
- `hubDiscovery.ts` - Hub discovery service using mDNS
- `commandExecutor.ts` - Command execution and validation
- `stateManager.ts` - Hub state management and caching

##### Storage Directory (`src/core/storage/`)
- `secureStorage.ts` - Secure credential and token storage
- `sessionManager.ts` - Session state persistence
- `cache.ts` - Caching implementation for hub data

##### WebSocket Directory (`src/core/websocket/`)
- `wsClient.ts` - WebSocket client implementation
- `messageHandler.ts` - WebSocket message processing
- `reconnection.ts` - Automatic reconnection logic

#### Types Directory (`src/types/`)
Core type definitions for the application.

- `harmony.ts` - Harmony Hub related types and interfaces
- `components.ts` - React component prop types
- `websocket.ts` - WebSocket message and event types
- `state.ts` - State machine and context types
- `errors.ts` - Error categories and types
- `logging.ts` - Logging system types

#### Features Directory (`src/features/`)

##### Control Feature (`src/features/control/`)
Main device control functionality.

- `components/`
  - `ActivityList.tsx` - Activity selection and control
  - `DeviceList.tsx` - Device selection and command execution
  - `CommandPalette.tsx` - Command selection interface
  - `ErrorBoundary.tsx` - Error handling component
  - `LoadingState.tsx` - Loading state indicators
  - `StatusBar.tsx` - Connection status display

- `hooks/`
  - `useHarmonyHub.ts` - Hub connection and state hook
  - `useDeviceCommands.ts` - Device command management
  - `useActivityControl.ts` - Activity control logic
  - `useErrorHandler.ts` - Error handling hook

- `machines/`
  - `harmonyMachine.ts` - XState machine for hub control
  - `activityMachine.ts` - Activity state management
  - `deviceMachine.ts` - Device state management

##### Shared Feature (`src/features/shared/`)
Reusable components and utilities.

- `components/`
  - `Button.tsx` - Styled button component
  - `Icon.tsx` - Icon component with variants
  - `Toast.tsx` - Toast notification component
  - `Spinner.tsx` - Loading spinner component

- `hooks/`
  - `useDebounce.ts` - Input debouncing hook
  - `useInterval.ts` - Interval management hook
  - `useLocalStorage.ts` - Local storage hook

#### Utils Directory (`src/utils/`)
General utility functions.

- `logger.ts` - Logging utility functions
- `validation.ts` - Input validation helpers
- `network.ts` - Network utility functions
- `time.ts` - Time and duration utilities

### Documentation Directory (`docs/`)

- `architecture.md` - System architecture documentation
- `api.md` - API documentation and examples
- `development.md` - Development setup and guidelines
- `testing.md` - Testing procedures and guidelines

### Configuration Files (Root)

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Testing configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Code formatting rules
- `README.md` - Project documentation
- `.Plan` - Project planning and tracking

## Development Guidelines

### 1. Code Organization
- Core services in `src/core`
- Features in `src/features`
- Shared components in `src/features/shared`
- Types in respective directories

### 2. State Management
- Use React hooks for UI state
- Implement proper cleanup
- Handle edge cases
- Cache invalidation

### 3. Error Handling
- Use ErrorCategory enum
- Implement retry logic
- Show user feedback
- Log appropriately

### 4. Performance
- Use caching where appropriate
- Implement lazy loading
- Optimize re-renders
- Clean up resources

### 5. Testing
- Unit test core functionality
- Test error scenarios
- Validate cache behavior
- Mock external services

## Future Considerations

1. **Cache Enhancement**
   - Configurable cache duration
   - Partial cache updates
   - Cache status indicators

2. **Performance**
   - Command batching
   - Connection pooling
   - State compression

3. **User Experience**
   - Custom command sequences
   - Activity templates
   - Quick actions

4. **Reliability**
   - Connection health checks
   - Automatic recovery
   - Offline support
