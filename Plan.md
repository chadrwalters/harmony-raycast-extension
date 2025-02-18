# Harmony Raycast Extension Refactoring Plan

## Overview
Based on the senior developer code review, we need to improve several areas of the codebase to align with Raycast extension best practices and enhance maintainability. This document outlines specific issues and their solutions.

## 1. Component Structure Refactoring

### Current Issues:
- `HarmonyCommand.tsx` is handling too much responsibility
- View logic is mixed with state management
- Duplicate error handling patterns

### Solution:
1. Break down `HarmonyCommand.tsx` into:
   ```
   src/
   ├── components/
   │   ├── views/
   │   │   ├── HubsView.tsx
   │   │   ├── DevicesView.tsx
   │   │   ├── ActivitiesView.tsx
   │   │   └── CommandsView.tsx
   │   ├── shared/
   │   │   ├── ErrorBoundary.tsx
   │   │   ├── LoadingIndicator.tsx
   │   │   └── EmptyState.tsx
   │   └── HarmonyCommand.tsx  (simplified router)
   ```

2. Create shared hooks:
   ```
   src/
   ├── hooks/
   │   ├── useCommandExecution.ts
   │   ├── useDeviceFiltering.ts
   │   └── useActivityFiltering.ts
   ```

## 2. State Management Implementation

### Current Issues:
- Complex state updates in useHarmony
- Scattered preference management
- Redundant state derivations

### Solution:
1. Implement Zustand store:
   ```typescript
   // src/store/harmonyStore.ts
   interface HarmonyState {
     devices: HarmonyDevice[];
     activities: HarmonyActivity[];
     loadingStage: LoadingStage;
     currentView: ViewType;
     // ... other state
   }

   const useHarmonyStore = create<HarmonyState>((set) => ({
     // ... state and actions
   }));
   ```

2. Move all async operations to store actions:
   - Device discovery
   - Command execution
   - Activity switching
   - Cache management

## 3. Type Definition Consolidation

### Current Issues:
- Duplicate types across files
- Inconsistent type naming
- Missing type documentation

### Solution:
1. Create organized type hierarchy:
   ```
   src/types/
   ├── harmony/
   │   ├── index.ts           (exports)
   │   ├── device.ts         (device types)
   │   ├── activity.ts       (activity types)
   │   ├── command.ts        (command types)
   │   └── state.ts          (state types)
   ├── api/
   │   └── hub.ts            (hub API types)
   └── utils/
       └── error.ts          (error types)
   ```

2. Document all types with JSDoc comments
3. Create type guards for complex type checking

## 4. Error Handling Enhancement

### Current Issues:
- Inconsistent error handling
- Duplicate try/catch blocks
- Basic error messages

### Solution:
1. Create error handling utilities:
   ```typescript
   // src/utils/errorHandling.ts
   export const withErrorHandling = async <T>(
     operation: () => Promise<T>,
     context: string,
     options?: {
       showToast?: boolean;
       retryCount?: number;
     }
   ): Promise<T>;
   ```

2. Implement error categories:
   ```typescript
   // src/types/error.ts
   export enum ErrorCategory {
     NETWORK = 'network',
     DEVICE = 'device',
     COMMAND = 'command',
     // ...
   }
   ```

3. Create error boundary wrapper component

## 5. Performance Optimizations

### Current Issues:
- Unnecessary re-renders
- Inefficient data fetching
- Redundant computations

### Solution:
1. Implement proper memoization:
   ```typescript
   const filteredDevices = useMemo(
     () => filterDevices(devices, searchText),
     [devices, searchText]
   );
   ```

2. Add request deduplication:
   ```typescript
   const cache = new Map<string, Promise<any>>();
   const dedupedRequest = (key: string, fn: () => Promise<any>) => {
     if (!cache.has(key)) {
       cache.set(key, fn());
     }
     return cache.get(key)!;
   };
   ```

## Implementation Order

1. **Phase 1: Foundation** (1-2 days)
   - Consolidate types
   - Set up Zustand store
   - Implement error handling utilities

2. **Phase 2: Component Refactoring** (2-3 days)
   - Break down HarmonyCommand
   - Create view components
   - Implement shared hooks

3. **Phase 3: State Management** (1-2 days)
   - Migrate to Zustand store
   - Clean up useHarmony
   - Implement proper caching

4. **Phase 4: Error Handling** (1 day)
   - Add error boundaries
   - Implement retry logic
   - Enhance error messages

5. **Phase 5: Performance** (1-2 days)
   - Add memoization
   - Implement request deduplication
   - Optimize renders

## Testing Strategy

1. Unit Tests:
   - Store actions
   - Utility functions
   - Type guards

2. Integration Tests:
   - Component interactions
   - State updates
   - Error handling

3. E2E Tests:
   - Full user flows
   - Error scenarios
   - Network conditions

## Success Metrics

1. Code Quality:
   - Reduced component complexity
   - Improved type coverage
   - Consistent error handling

2. Performance:
   - Faster initial load
   - Reduced render count
   - Better memory usage

3. User Experience:
   - More informative error messages
   - Faster command execution
   - Better loading states

## Next Steps

1. Review and prioritize this plan
2. Set up project management (issues/milestones)
3. Begin with Phase 1 implementation
4. Regular code reviews and testing
