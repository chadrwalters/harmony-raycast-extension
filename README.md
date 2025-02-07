# Harmony Control

Control your Logitech Harmony Hub devices directly from Raycast.

## Features

- 🔍 Automatic hub discovery on local network
- 📱 Control all your Harmony devices
- 🎯 Execute device commands with keyboard shortcuts
- 🚀 Fast command execution with local caching
- 🔄 Automatic reconnection and error recovery
- 🔒 Secure credential storage

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

### Core Services
- **Harmony Manager**: Core service for hub interaction and command execution
- **Session Manager**: Handles connection state and persistence
- **Storage Manager**: Secure data storage and caching
- **Error Handler**: Centralized error handling and recovery

### Features
- **Device Control**: Manage and control Harmony devices
- **Activity Control**: Start and manage Harmony activities
- **Command Execution**: Execute device commands with feedback
- **Cache Management**: Efficient data caching for better performance

## Development

### Prerequisites
- Node.js 16 or later
- Raycast extension development environment
- Logitech Harmony Hub on local network

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   ray build
   ```

### Development Mode
Test the extension within Raycast:
```bash
ray dev
```

### Testing
Run the test suite:
```bash
npm test
```

## Contributing

1. Follow the established directory structure
2. Place new features in appropriate feature directories
3. Use shared components for common UI elements
4. Maintain type safety throughout the codebase
5. Add proper error handling
6. Include tests for new functionality
7. Update documentation

## Keyboard Shortcuts

- `⏎` Execute command/view commands
- `⌘ ⏎` Execute command
- `⌘ ⇧ A` Switch to Activities
- `⌘ B` Back to Devices

## Performance

- Local caching of hub data
- 24-hour cache validity
- Automatic cache invalidation
- Lazy command loading
- Efficient command filtering

## Security

- Local network communication only
- Secure credential storage
- Input validation and sanitization
- Error message sanitization

## License

MIT License - see LICENSE file for details

## Acknowledgments

- `@harmonyhub/client-ws` - Harmony Hub WebSocket client
- `@harmonyhub/discover` - Harmony Hub discovery
- Raycast team for the excellent extension API