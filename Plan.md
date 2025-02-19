# Harmony Raycast Extension Refactoring Plan

## Overview
Based on the senior developer code review, we need to improve several areas of the codebase to align with Raycast extension best practices and enhance maintainability. This document outlines specific issues, solutions, and implementation strategy.

## Current Issues and Solutions

### Component Structure
**Issues:**
- `HarmonyCommand.tsx` is handling too much responsibility
- View logic is mixed with state management
- Duplicate error handling patterns

**Solutions:**
1. Break down `HarmonyCommand.tsx` into focused view components
2. Use simple view state management
3. Create reusable shared components

### State Management
**Issues:**
- Complex state updates in useHarmony
- Scattered preference management
- Redundant state derivations

**Solutions:**
1. Implement Zustand store for centralized state
2. Move async operations to store actions
3. Use selectors for derived state

### Error Handling
**Issues:**
- Inconsistent error handling
- Duplicate try/catch blocks
- Basic error messages

**Solutions:**
1. Implement simple, centralized error handling
2. Use Raycast's toast system effectively
3. Add proper error recovery flows

### Performance
**Issues:**
- Unnecessary re-renders
- Inefficient data fetching
- Memory leaks

**Solutions:**
1. Implement proper cleanup in useEffect
2. Use memoization for expensive computations
3. Proper component unmounting

## Implementation Strategy

### Phase 1: Core Foundation (1-2 days)
Dependencies: None
- [x] 1.1 Type Definition Consolidation ✅
  - Created organized type hierarchy in `src/types/core/`
  - Added comprehensive JSDoc documentation
  - Implemented type guards and validation utilities
  - Added immutable types with `readonly`
  - Created error handling types and utilities
  - Added WebSocket and state management types
  - Consolidated all types in central index
- [x] 1.2 Error and Logging Setup ✅
  - Implemented ErrorHandler with categorized error handling
  - Created ToastManager for consistent user notifications
  - Added Logger with multiple log levels and history
  - Integrated error handling with logging and toasts
  - Added error recovery actions and user-friendly messages
  - Implemented development mode console logging
- [x] 1.3 Zustand Store Setup ✅
  - Defined store structure with proper typing
  - Created mutable state types for Immer integration
  - Implemented comprehensive actions for hub, device, and activity management
  - Added error handling and loading state management
  - Created selectors for derived state
  - Integrated with error handling and toast notifications

### Phase 2: View Components (2-3 days)
Dependencies: Phase 1
- [x] 2.1 Shared Components ✅
  - Implemented FeedbackState for loading, error, and empty states
  - Created BaseActionPanel with common management actions
  - Added DeviceActionPanel for device-specific commands
  - Added ActivityActionPanel for activity controls
  - All components use Raycast UI patterns and keyboard shortcuts
  - Proper TypeScript typing and error handling
- [x] 2.2 HubsView Implementation ✅
  - Created HubsView component with hub discovery and selection
  - Integrated FeedbackState for loading, error, and empty states
  - Added search functionality for hubs
  - Implemented hub selection with visual feedback
  - Used BaseActionPanel for common actions
  - Added proper TypeScript typing and error handling
- [x] 2.3 DevicesView Implementation ✅
  - Created DevicesView with device listing and command execution
  - Implemented device grouping by type
  - Added search functionality for devices and commands
  - Integrated with DeviceActionPanel for command execution
  - Added detailed device view with command list
  - Implemented memoization for performance
  - Used FeedbackState for loading, error, and empty states
  - Added proper TypeScript typing and error handling
- [x] 2.4 ActivitiesView Implementation ✅
  - Created ActivitiesView with activity management
  - Implemented activity grouping by type
  - Added real-time status updates and visual feedback
  - Integrated with ActivityActionPanel for start/stop control
  - Added detailed activity view with status information
  - Implemented loading states for activity transitions
  - Added search functionality for activities
  - Used FeedbackState for loading, error, and empty states
  - Added proper TypeScript typing and error handling

### Phase 3: State and Navigation (1 day)
Dependencies: Phase 1, Phase 2
- [x] 3.1 View State Management ✅
  - Simple view state in HarmonyCommand
  - View transitions
  - Keyboard shortcuts
- [x] 3.2 Custom Hooks ✅
  - Implemented useCommandExecution with retry logic and error handling
  - Created useDeviceFiltering with memoized device filtering and grouping
  - Added useActivityFiltering with memoized activity filtering and status tracking
  - Built usePreferences with validation and error handling
- [x] 3.3 Store Integration ✅
  - Connected views to store using Zustand
  - Implemented proper cleanup in store actions
  - Added state persistence with versioning
  - Created persistence middleware for Zustand stores
  - Implemented local storage integration
  - Added error handling and logging for persistence
  - Implemented state hydration and migration support

### Phase 4: Performance and Polish (1-2 days)
Dependencies: All previous phases
- [x] 4.1 Performance Optimization ✅
  - Added React.memo for all view components
  - Extracted and memoized list item components
  - Implemented memoized callbacks with useCallback
  - Optimized data filtering with useMemo
  - Added custom comparison functions for memoization
  - Improved prop passing to reduce re-renders
  - Optimized component structure for better performance
  - Added proper cleanup in useEffect hooks
- [x] 4.2 Data Management ✅
  - Implemented LocalStorage for state persistence
  - Added preference handling with validation
  - Created cache management with versioning
  - Added state migration support
  - Implemented error handling for storage operations
- [x] 4.3 Error Experience ✅
  - Enhanced error visualization with color-coded status
  - Added category-specific icons and colors
  - Implemented detailed troubleshooting steps
  - Added progress feedback for async operations
  - Created recovery action suggestions
  - Improved error message formatting
  - Added technical details for debugging
  - Enhanced toast notifications with actions
  - Implemented error recovery flows
  - Added proper error cleanup and state reset

### Phase 5: Codebase Cleanup and Consolidation (1-2 days)
Dependencies: All previous phases

- [ ] 5.0 Preparation
  - Create comprehensive import map of all files and their dependencies
  - Create Git branch specifically for cleanup
  - Create full backup of codebase
  - Document current state of all error handling and toast notifications

- [ ] 5.1 Error Handler Migration
  - Create backup of `src/services/error-handler.ts`
  - Analyze differences between error-handler.ts and errorHandler.ts
  - Identify and document missing functionality (especially toast-related)
  - Migrate functionality to errorHandler.ts:
    - Success/warning toast methods
    - Loading state notifications
    - Configuration options
    - Any custom error handling patterns
  - Update harmony.ts to use new errorHandler.ts
  - Extensive testing of error scenarios:
    - Network disconnection handling
    - Invalid command handling
    - Toast notifications (all types)
    - Error logging
    - Recovery flows
  - Delete error-handler.ts after verification
  - Remove toast-manager.ts if no longer needed

- [ ] 5.2 Store Persistence Cleanup
  - Audit persistence in harmony.ts store:
    - State saving on changes
    - State loading on initialization
    - Error handling for storage operations
    - Version migration support
  - Audit persistence in view.ts store:
    - Same checks as harmony store
    - Verify no dependency on persist.ts
  - Test persistence thoroughly:
    - State changes are saved
    - State restores on reopen
    - Cache clearing works
    - Error handling works
  - Delete persist.ts after verification

- [ ] 5.3 Command Queue Migration
  - Evaluate current queue usage:
    - Determine if queueing is actually needed
    - Document current retry patterns
  - If queueing is NOT needed:
    - Extract retry logic to utility function
    - Move to harmonyClient.ts or new utils/retry.ts
    - Update harmonyClient to use new retry logic
    - Delete commandQueue.ts
  - If queueing IS needed:
    - Integrate queue into useHarmony hook
    - Adapt API for hook usage
    - Update harmonyClient.ts
    - Ensure concurrency handling
  - Test extensively:
    - Retry logic
    - Timeout handling
    - Error propagation
    - Cancellation (if kept)
    - Preference integration

- [ ] 5.4 Type System Cleanup
  - Merge harmony.ts into core/harmony.ts:
    - Move all type definitions
    - Update import statements
    - Run TypeScript compilation
    - Fix any type errors
    - Delete harmony.ts
  - Delete state.ts (verified unused)
  - Verify no type regressions
  - Check for any introduced 'any' types
  - Ensure all functions have return types

- [ ] 5.5 Final Verification
  - Run full TypeScript compilation
  - Run linter checks
  - Manual testing of core functionality:
    - Hub discovery
    - Hub connection
    - Device listing
    - Command execution
    - Activity management
    - Preference handling
    - Error scenarios
    - Cache operations
  - Verify no broken imports
  - Check documentation accuracy
  - Test extension startup and shutdown
  - Verify state persistence

- [ ] 5.6 Documentation Updates
  - Update all affected documentation
  - Remove references to deleted files
  - Update type documentation
  - Document new error handling patterns
  - Update persistence documentation
  - Document retry/queue changes
  - Update API documentation if needed

Estimated time increased to 1-2 days to account for thorough testing and verification steps.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes in Raycast API | Low | High | Monitor Raycast releases |
| Memory leaks | Medium | High | Proper useEffect cleanup |
| Network failures | Medium | Medium | Robust error handling |
| State corruption | Low | High | Proper validation |
| User settings loss | Low | High | LocalStorage backup |

## User Experience

### During Refactoring
- Maintain backward compatibility
- Clear error messages
- Performance monitoring
- Graceful degradation

### Release Strategy
1. Internal testing
   - Functionality verification
   - Performance checks
2. Limited user testing
   - Feedback collection
   - Issue tracking
3. Full release
   - Staged rollout
   - Monitor for issues

## Raycast Compliance

### Component Usage
- Use Raycast UI components exclusively
  - List
  - Detail
  - ActionPanel
  - Form
- Follow Raycast's design guidelines
  - Typography
  - Spacing
  - Icons
- Implement keyboard shortcuts
  - View switching
  - Common actions
  - Navigation

### Performance Requirements
- Proper useEffect cleanup
  - Event listeners
  - Timers
  - WebSocket connections
- Efficient state management
  - Zustand store
  - Memoized selectors
  - Minimal component state
- Raycast API usage
  - LocalStorage for persistence
  - Toast for user feedback
  - Preference management

## Next Steps

1. Review and approve updated plan
2. Begin Phase 1 implementation
3. Regular progress reviews
4. User communication
