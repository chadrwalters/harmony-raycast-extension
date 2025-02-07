# Harmony Control

Integrates Logitech Harmony with Raycast

## Project Structure

```
src/
├── commands/                 # Raycast command entry points
│   ├── control.tsx          # Main control interface
│   └── settings.tsx         # Settings management
├── core/                    # Core functionality and services
│   ├── harmony/             # Harmony-specific implementation
│   ├── logging/             # Logging and error handling
│   ├── network/             # Network-related utilities
│   ├── session/             # Session management
│   ├── storage/             # Data persistence
│   ├── types/               # Core type definitions
│   ├── ui/                  # UI utilities
│   └── utils/               # General utilities
└── features/               # Feature-specific code
    ├── control/            # Device control feature
    │   ├── components/     # React components
    │   ├── hooks/         # React hooks
    │   └── types/         # Feature-specific types
    └── shared/            # Shared components
        └── components/    # Common UI components

```

## Key Components

- **Control Command**: Main interface for controlling Harmony devices and activities
- **Settings Command**: Configuration interface for the extension
- **Harmony Manager**: Core service for interacting with Harmony Hub
- **Session Manager**: Handles authentication and session state
- **Error Handler**: Centralized error handling and logging

## Development

### Prerequisites
- Node.js
- Raycast extension development environment
- Logitech Harmony Hub

### Building
```bash
ray build
```

### Testing
Test the extension within Raycast by running:
```bash
ray dev
```

## Contributing

1. Follow the established directory structure
2. Place new features in the appropriate feature directory
3. Use shared components for common UI elements
4. Maintain type safety throughout the codebase