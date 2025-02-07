# Core Module

The core module contains foundational services and utilities that power the Harmony Raycast extension. This module is designed to be framework-agnostic and handles the business logic of the application.

## Directory Structure

### `/harmony`
Contains all Harmony Hub integration logic, including device discovery, command execution, and state management.

### `/logging`
Centralized logging and error handling services for consistent error reporting and debugging.

### `/network`
Network-related utilities, including retry logic and connection management.

### `/session`
Session management and state persistence functionality.

### `/storage`
Secure storage implementation for sensitive data like hub credentials.

### `/types`
Core type definitions used across the application.

### `/ui`
Framework-agnostic UI utilities like toast notifications.

### `/utils`
General utility functions for performance monitoring and validation.

## Best Practices

1. Keep core logic framework-agnostic
2. Implement proper error handling
3. Use TypeScript for type safety
4. Document public APIs with JSDoc
5. Write unit tests for core functionality
