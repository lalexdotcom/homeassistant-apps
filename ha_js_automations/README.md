# JS Automations App



https://github.com/user-attachments/assets/9a0d00fb-50f7-42fd-9256-b25d50ba362b



> [!WARNING]
> This application is currently a **Proof of Concept (POC)**. It is not yet optimized for performance and should **not be used in production environments**.

Create Home Assistant automations using **JavaScript** or **TypeScript**.

This app brings modern web development practices to Home Assistant automation by allowing you to write automations in TypeScript/JavaScript instead of YAML. It provides a complete development environment with VSCode integration, TypeScript support, and hot-reload capabilities.

## Features

- 🚀 **TypeScript/JavaScript Support**: Write automations in TypeScript with full type safety or plain JavaScript
- 💻 **VSCode Integration**: Built-in code editor with theme support
- 🔄 **Hot-Reload**: Changes to your automation scripts are automatically detected and applied
- 📚 **Type-Safe API**: Full TypeScript definitions for Home Assistant entities and services via `ha-ws-js-sugar`
- 🎯 **Reactive Automations**: Powerful API built on top of the [ha-ws-js-sugar](https://github.com/lalexdotcom/ha-ws-js-sugar) package
- 🐳 **Multi-Architecture**: Runs on both ARM (Raspberry Pi) and x86 systems

## Usage

### Basic Example

Create a script in the VSCode editor (files are stored in the app's folder):

```typescript
import { connection } from "ha-js-automations";

// Get an entity
const testBoolean = await connection.getEntity(
  "input_boolean.test_input_boolean",
);

// Access the current state
console.log("Current state:", testBoolean.state);

// Listen to state changes
testBoolean?.addListener((newState, oldState) => {
  console.log("State changed from:", oldState, "to", newState);
});
```

### Script Organization

Your automation scripts should be placed in the app-specific config directory. Each TypeScript/JavaScript file is treated as an independent automation that runs in its own context.

The key difference from using `ha-ws-js-sugar` directly is that you must import `connection` from the `ha-js-automations` package:

```typescript
import { connection } from "ha-js-automations";
```

This provides a pre-configured WebSocket connection to your Home Assistant instance.

## Installation

### Prerequisites

- Home Assistant with Apps support

### Steps

1. Add the application repository to Home Assistant:
   - Go to **Settings** → **Apps** (or **Apps & integrations** depending on your version)
   - Select **Repositories** (or **Create automation**)
   - Add: `https://github.com/lalexdotcom/homeassistant-apps`
   - Confirm

2. Install the app:
   - In the **Apps** section, search for **JS/TS Automations**
   - Click **Install**
   - Configure as needed (see Configuration section)
   - Click **Start**

3. Access the VSCode editor:
   - Click **OPEN WEB UI** on the app page
   - A VSCode instance will open with your automation scripts

## Configuration

The app provides the following configuration options:

### `log_level`

- Set the logging level for the application
- Options: `trace`, `debug`, `info`, `notice`, `warning`, `error`, `fatal`
- Default: `info`

### `npm_packages`

- List of additional npm packages to install in your automation environment
- Example: `axios`, `date-fns`, `lodash`
- Default: `[]`

## Development

### TODO List

- [ ] review and optimize Docker image
- [ ] optimise inter process communication (IPC)
- [ ] override console to use bashio
- [ ] error handlink
- [ ] custom vscode extension to display running automations

### Project Structure

```
ha_js_automations/
├── automations/
│   ├── ha-js-automations/          # Core library (types, utilities)
│   │   └── src/
│   │       ├── index.ts            # Main export
│   │       └── connection/         # WebSocket connection handling
│   └── main/                       # Runtime that executes automations
│       └── src/
│           ├── index.ts            # App entry point
│           ├── script.ts           # Script execution logic
│           ├── watcher.ts          # File watcher for hot-reload
│           └── types.ts            # Shared types
├── rootfs/                         # Docker container runtime files
└── config.yaml                     # App configuration
```

### Building

To rebuild the app after making changes to the TypeScript code:

```bash
cd /mnt/supervisor/addons/local/homeassistant-apps/ha_js_automations
pnpm install
pnpm run build
```

### Local Development

The app includes a development server for testing:

```bash
cd automations/ha-js-automations
pnpm run play
```

This starts a development environment where you can test the API against your Home Assistant instance.

## Dependencies

- **ha-ws-js-sugar**: Provides the reactive API for interacting with Home Assistant
- **home-assistant-js-websocket**: WebSocket client for Home Assistant
- **chokidar**: File system watcher for detecting script changes (hot-reload)

## API Reference

### Connection Object

Import the pre-configured connection to Home Assistant:

```typescript
import { connection } from "ha-js-automations";
```

### Getting Entities

Use `connection.getEntity()` to retrieve an entity by its ID:

```typescript
const entity = await connection.getEntity("input_boolean.test_input_boolean");
```

### Accessing Entity State

Access the current state of an entity:

```typescript
const entity = await connection.getEntity("light.living_room");
console.log(entity.state); // Current state value
```

### Listening to State Changes

Add a listener to respond to entity state changes:

```typescript
const entity = await connection.getEntity("sensor.temperature");
entity?.addListener((newState, oldState) => {
  console.log("Changed from:", oldState, "to:", newState);
});
```

For more advanced features and detailed documentation about `ha-ws-js-sugar`, see the [ha-ws-js-sugar repository](https://github.com/lalexdotcom/ha-ws-js-sugar).

## Troubleshooting

### Scripts Not Running

1. Check the app logs in the Home Assistant UI
2. Verify your TypeScript/JavaScript syntax is correct
3. Ensure the script file is saved
4. Try restarting the app

### VSCode Editor Not Loading

1. Clear your browser cache
2. Try accessing the editor from a different browser tab
3. Restart the app

### Missing Dependencies

1. Add required npm packages via the `npm_packages` configuration option
2. Restart the app for changes to take effect

## License

MIT License - See [LICENSE](../LICENSE) file for details.

## Support

For issues, questions, or contributions:

- 📦 **Repository**: [homeassistant-apps](https://github.com/lalexdotcom/homeassistant-apps)
- 🔗 **API Package**: [ha-ws-js-sugar](https://github.com/lalexdotcom/ha-ws-js-sugar)

## Resources

- [Home Assistant Documentation](https://www.home-assistant.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
