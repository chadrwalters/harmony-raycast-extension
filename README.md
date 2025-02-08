# Harmony Control

Control your Logitech Harmony Hub devices directly from Raycast.

## Features

- 🔍 Automatic hub discovery on local network
- 📱 Control all your Harmony devices
- 🎯 Execute device commands with keyboard shortcuts
- 🚀 Fast command execution with local caching
- 🔄 Automatic reconnection and error recovery
- 🔒 Secure credential storage

## Setup Instructions

### Prerequisites
1. **Harmony Hub**
   - Powered on and connected to your local network
   - Configured with your devices and activities
   - Firmware up to date

2. **Network Requirements**
   - Harmony Hub and Mac on same local network
   - Ports 35000-35004 available for hub discovery
   - Local network allows device discovery

### Installation
1. **Install Extension**
   - Open Raycast
   - Go to Store
   - Search for "Harmony Control"
   - Click Install

2. **First Run Setup**
   - Launch with `⌘ Space` and type "Harmony"
   - Wait for automatic hub discovery (up to 30 seconds)
   - Select your hub when found
   - Extension will cache your hub's configuration

### Troubleshooting First Run
- **Hub Not Found**
  - Verify hub is powered on
  - Check network connection
  - Ensure no firewall blocking
  - Try restarting the hub

- **Connection Issues**
  - Check network stability
  - Verify hub IP hasn't changed
  - Clear extension cache if needed

## Usage Guide

### Configuration
1. **Preferences**
   Configure the extension behavior through Raycast preferences:

   1. **Default View**
      - `activities`: Show Activities view first (default)
      - `devices`: Show Devices view first
      - Switch between views using:
        - ⌘ ⇧ A: Switch to Activities
        - ⌘ ⇧ D: Switch to Devices

   2. **Cache Settings**
      - `cacheDuration`: How long to cache hub data (in seconds)
      - `networkTimeout`: Network operation timeout (in seconds)

   3. **Debug Options**
      - `debugMode`: Enable detailed logging
      - `autoRetry`: Automatically retry failed commands
      - `maxRetries`: Maximum number of command retries

2. **Device Control**
   1. **View Devices**
      - Open extension
      - Select a device from the list
      - View available commands

   2. **Execute Commands**
      - Select desired command
      - Press `⏎` to execute
      - Wait for confirmation

   3. **Quick Actions**
      - `⌘ ⏎` Execute command
      - `⌘ ⇧ A` Switch to Activities
      - `⌘ B` Back to Devices

### Activities
1. **Start Activity**
   - Switch to Activities view
   - Select desired activity
   - Press `⏎` to start

2. **Stop Activity**
   - Select current activity
   - Choose "Power Off"
   - Press `⏎` to confirm

## Advanced Features

### Command Customization
1. **Custom Commands**
   - Create custom command sequences
   - Map commands to keyboard shortcuts
   - Save frequently used commands

2. **Activity Automation**
   - Schedule activities
   - Create activity triggers
   - Chain multiple commands

### Network Configuration
1. **Hub Discovery**
   - Automatic mDNS discovery
   - Manual IP configuration
   - Multiple hub support

2. **Connection Management**
   - Automatic reconnection
   - Connection health monitoring
   - Network diagnostics

### Performance Optimization
1. **Caching**
   - Smart command caching
   - Device state caching
   - Automatic cache invalidation

2. **Command Execution**
   - Command queuing
   - Rate limiting
   - Priority execution

## API Documentation

### Hub Discovery
- Automatic scanning on ports 35000-35004
- 30-second timeout per port
- Automatic retry with 1-second delay
- 10-second grace period after last hub found

### Command Execution
- Commands are queued and executed sequentially
- Automatic reconnection on connection loss
- Error handling with automatic recovery
- Command hold time configurable

### Data Caching
- Local caching of hub configuration
- 24-hour cache validity
- Automatic cache invalidation
- Cache cleared on version update

### Error Categories
- `NETWORK`: Network connectivity issues
- `HUB`: Harmony Hub communication errors
- `COMMAND`: Command execution failures
- `STORAGE`: Cache and storage errors
- `WEBSOCKET`: WebSocket connection issues

## Troubleshooting

### Common Issues

1. **Hub Connection Lost**
   - Check network connectivity
   - Verify hub is powered on
   - Try clearing extension cache
   - Restart hub if persistent

2. **Command Execution Failed**
   - Ensure device is powered on
   - Check line of sight to device
   - Verify command is supported
   - Try restarting activity

3. **Hub Not Found**
   - Check network connection
   - Verify hub IP address
   - Ensure ports are available
   - Check firewall settings

### Error Recovery

1. **Network Issues**
   - Extension will automatically retry
   - Check Wi-Fi connection
   - Verify hub is online
   - Reset network if needed

2. **Cache Problems**
   - Clear extension cache
   - Rediscover hub
   - Reconfigure if needed

3. **WebSocket Errors**
   - Automatic reconnection
   - Manual reconnect if needed
   - Check network stability

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

## Development

### Project Structure
```
harmony-raycast-extension/
├── src/                    # Source code
│   ├── core/              # Core functionality
│   │   ├── harmony/       # Harmony Hub integration
│   │   ├── storage/       # Data persistence
│   │   └── websocket/     # WebSocket handling
│   ├── features/          # Feature modules
│   │   ├── control/       # Device control
│   │   └── shared/        # Shared components
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── docs/                  # Documentation
└── tests/                 # Test files
```

### Prerequisites
- Node.js 16 or later
- yarn or npm
- TypeScript 4.5+

### Installation
1. **Prerequisites**
   - Node.js 16+
   - yarn or npm
   - TypeScript 4.5+

2. **Setup**
   ```bash
   # Clone repository
   git clone https://github.com/raycast/extensions
   cd extensions/harmony-control

   # Install dependencies
   yarn install

   # Build extension
   yarn build
   ```

3. **Development**
   ```bash
   # Start development mode
   yarn dev

   # Run tests
   yarn test

   # Type checking
   yarn typecheck
   ```

### Contributing
1. **Guidelines**
   - Follow TypeScript best practices
   - Write comprehensive tests
   - Document all public APIs
   - Keep components focused

2. **Pull Requests**
   - Create feature branch
   - Add tests for new features
   - Update documentation
   - Follow commit guidelines

## Troubleshooting

### Common Issues

1. **Connection Problems**
   - **Symptom**: Hub not found or connection fails
   - **Solutions**:
     - Check network connectivity
     - Verify hub is powered on
     - Ensure correct network subnet
     - Check firewall settings

2. **Command Execution Issues**
   - **Symptom**: Commands not executing
   - **Solutions**:
     - Verify device is powered on
     - Check command compatibility
     - Clear command cache
     - Restart hub if needed

3. **Performance Issues**
   - **Symptom**: Slow response times
   - **Solutions**:
     - Clear cached data
     - Check network latency
     - Reduce active connections
     - Update hub firmware

### Debug Mode
1. **Enabling Debug Logs**
   ```bash
   # Enable debug mode in preferences
   - Open extension preferences
   - Set debugMode to true
   - Restart extension
   ```

2. **Log Analysis**
   - Check Raycast console
   - Review debug output
   - Analyze error patterns
   - Monitor performance metrics

## Support

### Getting Help
- GitHub Issues: Report bugs and feature requests
- Documentation: Check latest docs
- Community: Join Raycast Discord

### Updates
- Regular bug fixes
- Feature enhancements
- Security updates
- Performance improvements

## License

MIT License - see LICENSE file for details