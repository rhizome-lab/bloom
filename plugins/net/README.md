# @viwo/plugin-net

Network plugin for Viwo. Provides capabilities to make HTTP requests.

## Installation

```bash
bun add @viwo/plugin-net
```

## Usage

Register the plugin in your server:

```typescript
import { NetPlugin } from "@viwo/plugin-net";

await pluginManager.loadPlugin(new NetPlugin());
```

## Capabilities

- `net.http`: Access to HTTP requests for specific domains.

## Opcodes

- `net.http.fetch(cap, url, options)`: Perform an HTTP request.
- `net.http.response_text(response)`: Get response body as text.
- `net.http.response_json(response)`: Get response body as JSON.
- `net.http.response_bytes(response)`: Get response body as bytes.
