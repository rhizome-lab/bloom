# Network Plugin

The `@viwo/plugin-net` package provides network capabilities to ViwoScript.

## Capabilities

### `net.http`

Allows making HTTP requests to specific domains.

**Parameters:**

- `domain`: The domain suffix allowed (e.g., "example.com").
- `methods`: (Optional) List of allowed HTTP methods (e.g., ["GET", "POST"]).

## Opcodes

### `net.http.fetch(cap, url, options)`

Performs an HTTP request.

- `cap`: A capability of type `net.http`.
- `url`: The URL to fetch.
- `options`: Optional object with `method`, `headers`, and `body`.

### `net.http.response_text(response)`

Returns the response body as text.

### `net.http.response_json(response)`

Returns the response body parsed as JSON.

### `net.http.response_bytes(response)`

Returns the response body as an array of bytes.
