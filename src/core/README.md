# Core Module

The core module contains foundational services and utilities that power the Harmony Raycast extension. This module is designed to be framework-agnostic and handles the business logic of the application.

## Directory Structure

### `/harmony`
Contains all Harmony Hub integration logic:
- Hub discovery and connection management
- Command execution and validation
- Activity and device state management
- Local data caching with 24-hour validity
- Automatic cache invalidation and refresh

### `/logging`
Centralized logging and error handling:
- Typed error categories
- Contextual error messages
- Development logging
- Error sanitization

### `/network`
Network-related utilities:
- Connection management
- Retry logic with backoff
- WebSocket communication
- Network status monitoring

### `/session`
Session management:
- Connection state persistence
- User preferences
- Cache state tracking
- Session cleanup

### `/storage`
Secure storage implementation:
- Credential management
- Local data caching
- Cache invalidation
- Data encryption

### `/types`
Core type definitions:
- Harmony Hub types
- Command interfaces
- Error categories
- State definitions

### `/ui`
Framework-agnostic UI utilities:
- Toast notifications
- Loading states
- Error messages
- Status indicators

### `/utils`
General utility functions:
- Performance monitoring
- Data validation
- Type guards
- Helper functions

## Best Practices

1. Core Logic
   - Keep business logic framework-agnostic
   - Implement proper error handling
   - Use TypeScript for type safety
   - Follow SOLID principles

2. Error Handling
   - Use typed error categories
   - Provide context in error messages
   - Implement retry strategies
   - Log appropriately

3. Performance
   - Implement efficient caching
   - Use lazy loading
   - Optimize data structures
   - Clean up resources

4. Security
   - Secure credential storage
   - Validate all inputs
   - Sanitize error messages
   - Follow security best practices

5. Documentation
   - Document public APIs
   - Include usage examples
   - Document type definitions
   - Keep documentation current

6. Testing
   - Write unit tests
   - Test error scenarios
   - Validate cache behavior
   - Mock external services
