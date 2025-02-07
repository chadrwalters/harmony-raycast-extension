# Features Module

The features module contains all feature-specific implementations, organized by domain. Each feature is self-contained and includes its own components, types, and business logic.

## Directory Structure

### `/control`
The main feature for controlling Harmony Hub devices. Includes:
- Components for device and command UI
- Context providers for state management
- Feature-specific types

### `/shared`
Reusable components and utilities shared across features. Includes:
- Common UI components
- Shared hooks and utilities
- Base component types

## Best Practices

1. Keep features self-contained
2. Share common code through the shared module
3. Use TypeScript for type safety
4. Implement proper error boundaries
5. Document component props and hooks
6. Write unit tests for components

## Adding New Features

1. Create a new directory under `/features`
2. Include necessary subdirectories:
   - `/components` - React components
   - `/context` - State management
   - `/types` - TypeScript definitions
   - `/hooks` - Custom React hooks
3. Add feature-specific tests
4. Document the feature's purpose and usage
