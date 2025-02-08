# Harmony Hub Extension Migration Plan

## Critical Notes
1. There is no rollback. We get this right or die trying.
2. Every change must be tested and verified.
3. Type safety is paramount.
4. No new files unless absolutely necessary.
5. All code must match backup patterns exactly.
6. Maintain compatibility with @harmonyhub/client-ws package.

## Pre-Phase Checklist
For EVERY phase:

1. **Documentation Review**
   - [x] Review migrationPlan.md completely
   - [x] Review brokenArchitecture.md to understand current state
   - [x] Review backupArchitecture.md to understand target state
   - [x] Document any discrepancies found

2. **Code Review**
   - [x] Review all files to be modified
   - [x] Review all files that interact with modified files
   - [x] Document all dependencies
   - [x] Verify type consistency

3. **Test Setup**
   - [ ] Create test file for each component
   - [ ] Add edge case tests
   - [ ] Add error case tests

## Phase 1: Core Infrastructure

### Pre-Implementation
1. **Files to Review**:
   - `src/services/harmony/harmonyClient.ts`
   - `src/types/errors.ts`
   - `src/services/errorHandler.ts`

2. **Dependencies to Check**:
   - @harmonyhub/client-ws
   - @harmonyhub/discover
   - EventEmitter

### 1.1 Connection Management (`src/services/harmony/harmonyClient.ts`)
Status: Complete
- [x] Add connection timeout handling
- [x] Add reconnection logic with exponential backoff
- [x] Add connection health checks
- [x] Add proper cleanup on disconnect
- [x] Add connection state validation

### 1.2 Error Handling (`src/types/errors.ts`)
Status: Complete
- [x] Add retry context to HarmonyError
- [x] Add timeout configurations
- [x] Add error categories
- [x] Add retry logic with backoff
- [x] Add error recovery patterns

### Key Changes Made:
1. **Connection Management**:
   - Added 10s connection timeout
   - Added automatic reconnection (up to 3 attempts)
   - Added exponential backoff for retries
   - Added connection health checks
   - Added proper resource cleanup

2. **Error Handling**:
   - Enhanced error categorization
   - Added retry context
   - Added timeout configurations
   - Added error recovery logic
   - Improved error logging

3. **State Management**:
   - Added connection promise to prevent duplicates
   - Added proper state tracking
   - Added connection validation
   - Added health check monitoring

## Phase 2: Discovery and Connection

### Pre-Implementation
1. **Files to Review**:
   - `src/services/harmony/harmonyManager.ts`
   - `src/services/harmony/harmonyClient.ts`
   - `src/types/harmony.ts`

2. **Dependencies Checked**:
   - @harmonyhub/discover
   - @harmonyhub/client-ws
   - LocalStorage
   - EventEmitter

3. **Key Interfaces**:
   - HarmonyHub
   - HarmonyHubStatus
   - HarmonyState
   - LoadingState

### 2.1 Hub Discovery and Port Binding
Status: Complete
- [x] Add discovery timeout (10s)
- [x] Add discovery validation
- [x] Add retry logic (3 attempts)
- [x] Add caching with LocalStorage
- [x] Add proper error handling
- [x] Add cleanup of resources
- [x] Fix port binding issues by:
  - [x] Using higher port range (35000+) from backup
  - [x] Adding port retry logic with MAX_PORT_TRIES
  - [x] Adding proper WebSocket state tracking
  - [x] Adding connection state validation

### 2.2 Connection Management
Status: Complete
- [x] Add proper WebSocket state constants
- [x] Add connection state validation
- [x] Add connection promise tracking
- [x] Add proper cleanup on state transitions
- [x] Add WebSocket health checks
- [x] Add automatic reconnection with backoff
- [x] Add connection state events
- [x] Add proper error categorization
- [x] Add connection monitoring
- [x] Add ping/pong tracking
- [x] Add health check interval

### 2.3 State Machine Implementation
Status: Complete
- [x] Port HarmonyMachine class from backup
- [x] Add state definitions (IDLE, DISCOVERING, etc.)
- [x] Add event definitions (START_DISCOVERY, HUB_DISCOVERED, etc.)
- [x] Add proper context management
- [x] Add state transitions
- [x] Add action handlers
- [x] Add service implementations
- [x] Add proper error handling
- [x] Add activity management
- [x] Add disconnection handling

## Phase 3: Command Queue
Status: In Progress

### 3.1 Queue Implementation
Status: Complete
- [x] Add command queue class
- [x] Add rate limiting
- [x] Add command validation
- [x] Add queue state management
- [x] Add command timeout handling
- [x] Add retry logic with backoff
- [x] Add proper error categorization
- [x] Add queue cleanup

### 3.2 Command Types
Status: Complete
- [x] Add command request interface
- [x] Add command result interface
- [x] Add command status enum
- [x] Add queue configuration interface
- [x] Update harmony command interface
- [x] Add proper type validation
- [x] Add command sender type

### 3.3 Command Execution
Status: Complete
- [x] Add command body format with IRCommand type
- [x] Add preference-based hold time
- [x] Add device validation
- [x] Add command validation
- [x] Add proper error handling
- [x] Add detailed logging
- [x] Add command caching
- [x] Add proper cleanup

### 3.4 Activity Management
Status: Not Started
1. **Activity State**
   - Add activity state tracking
   - Add activity transitions
   - Add activity validation
   - Add proper error handling

2. **Activity Operations**
   - Add activity start/stop logic
   - Add activity status checks
   - Add activity error recovery
   - Add proper cleanup

## Next Steps

1. **Implement Activity Management (Priority)**
   - Port activity management from backup
   - Add activity state tracking
   - Add activity transitions
   - Add proper error handling

2. **Add UI Components**
   - Add activity selection UI
   - Add device control UI
   - Add status indicators
   - Add error feedback

## Why These Changes Are Needed

1. **Command Queue**
   - Prevents command flooding
   - Ensures reliable command execution
   - Provides proper error recovery
   - Maintains command state

2. **Activity Management**
   - Required for proper activity transitions
   - Ensures reliable state tracking
   - Prevents activity conflicts
   - Provides proper cleanup

## Notes
- [2025-02-07] Completed state machine implementation with proper state transitions and error handling
- [2025-02-07] Added disconnection handling and activity management from backup
- [2025-02-07] Completed command queue implementation with proper command validation and error handling
- [2025-02-07] Added preference-based command timing and IRCommand type from backup
