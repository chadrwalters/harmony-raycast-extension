# Harmony Raycast Extension

Control your Logitech Harmony Hub directly from Raycast. This extension allows you to manage your devices, execute commands, and control activities without leaving your keyboard.

## Features

- 🔍 Automatic hub discovery on your network
- 📱 Control all your Harmony-connected devices
- ⚡️ Quick access to device commands
- 🎮 Start and stop activities
- 🔄 Real-time status updates
- ⌨️ Full keyboard navigation

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install the Harmony extension from the Raycast store
3. The extension will automatically discover your Harmony Hub(s) on the network

## Usage

### Hub Connection

The extension will automatically discover Harmony Hubs on your local network. 

**Note**: If only one Harmony Hub is found on your network, the extension will automatically connect to it. This auto-connection behavior is designed to streamline the experience for users with a single hub setup.

### Device Control

1. Select a device from the list
2. Browse available commands
3. Execute commands with a single click or keyboard shortcut

### Activities

1. View all configured activities
2. Start or stop activities
3. See real-time activity status

## Keyboard Shortcuts

- `⌘ + R`: Refresh hub/device list
- `⌘ + [`: Go back to previous view
- `⌘ + Backspace`: Clear cache
- `⌘ + Shift + R`: Reconnect to hub
- `⌘ + Shift + A`: Switch to Activities view
- `⌘ + Shift + D`: Switch to Devices view
- `⌘ + K`: Open command palette for quick actions

## Troubleshooting

If you encounter any issues:

1. Try refreshing the hub connection (⌘ + R)
2. Clear the cache (⌘ + Backspace)
3. Ensure your Harmony Hub is on the same network
4. Check your network firewall settings

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/harmony-raycast-extension.git

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.