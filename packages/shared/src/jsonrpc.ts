/**
 * Represents a JSON-RPC 2.0 Request object.
 * @template Type The type of the params.
 */
export interface JsonRpcRequest<Type = any> {
  jsonrpc: "2.0";
  /** The name of the method to be invoked. */
  method: string;
  /** A Structured value that holds the parameter values to be used during the invocation of the method. */
  params?: Type;
  /** An identifier established by the Client that MUST contain a String, Number, or NULL value if included. */
  id: number | string;
}

/**
 * Represents a JSON-RPC 2.0 Notification object.
 * A Notification is a Request object without an "id" member.
 * @template Type The type of the params.
 */
export interface JsonRpcNotification<Type = any> {
  jsonrpc: "2.0";
  /** The name of the method to be invoked. */
  method: string;
  /** A Structured value that holds the parameter values to be used during the invocation of the method. */
  params?: Type;
}

/**
 * Represents a JSON-RPC 2.0 Success Response object.
 * @template Type The type of the result.
 */
export interface JsonRpcSuccess<Type = any> {
  jsonrpc: "2.0";
  /** The value of this member is determined by the method invoked on the Server. */
  result: Type;
  /** This member is REQUIRED. It MUST be the same as the value of the id member in the Request Object. */
  id: number | string;
}

/**
 * Represents a JSON-RPC 2.0 Error Response object.
 */
export interface JsonRpcError {
  jsonrpc: "2.0";
  /** The error object. */
  error: {
    /** A Number that indicates the error type that occurred. */
    code: number;
    /** A String providing a short description of the error. */
    message: string;
    /** A Primitive or Structured value that contains additional information about the error. */
    data?: any;
  };
  /** This member is REQUIRED. It MUST be the same as the value of the id member in the Request Object. */
  id: number | string | null;
}

/**
 * Represents a JSON-RPC 2.0 Response object (Success or Error).
 * @template Type The type of the result.
 */
export type JsonRpcResponse<Type = any> = JsonRpcSuccess<Type> | JsonRpcError;

/** Parameters for a 'stream_start' notification. */
export interface StreamStartNotificationParams {
  /** The ID of the stream (usually correlates to a request ID or unique stream ID). */
  streamId: string;
}

/** A notification sent by the server to indicate the start of a stream. */
export interface StreamStartNotification extends JsonRpcNotification {
  method: "stream_start";
  params: StreamStartNotificationParams;
}

/** Parameters for a 'stream_chunk' notification. */
export interface StreamChunkNotificationParams {
  /** The ID of the stream. */
  streamId: string;
  /** The chunk of text. */
  chunk: string;
}

/** A notification sent by the server containing a chunk of streamed text. */
export interface StreamChunkNotification extends JsonRpcNotification {
  method: "stream_chunk";
  params: StreamChunkNotificationParams;
}

/** Parameters for a 'stream_end' notification. */
export interface StreamEndNotificationParams {
  /** The ID of the stream. */
  streamId: string;
}

/** A notification sent by the server to indicate the end of a stream. */
export interface StreamEndNotification extends JsonRpcNotification {
  method: "stream_end";
  params: StreamEndNotificationParams;
}

/** Union type for any JSON-RPC message. */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

// Specific Notification Types

/** Parameters for a 'message' notification. */
export interface MessageNotificationParams {
  /** The type of message (info or error). */
  type: "info" | "error";
  /** The message text. */
  text: string;
}

/** A notification sent by the server to display a message to the user. */
export interface MessageNotification extends JsonRpcNotification {
  method: "message";
  params: MessageNotificationParams;
}

/**
 * Represents a game entity.
 * Everything in the game is an Entity (Room, Player, Item, Exit, etc.).
 */
export interface Entity {
  /** Unique ID of the entity */
  id: number;
  /** Unique ID of the entity's prototype */
  prototype_id?: number | null;
  /**
   * Resolved properties (merged from prototype and instance).
   * Contains arbitrary game data like description, adjectives, custom_css.
   */
  [key: string]: unknown;
}

/** Parameters for an 'update' notification. */
export interface UpdateNotificationParams {
  /** The list of entities to update in the client's state. */
  entities: readonly Entity[];
}

/** A notification sent by the server to update the client's entity state. */
export interface UpdateNotification extends JsonRpcNotification {
  method: "update";
  params: UpdateNotificationParams;
}

/** Parameters for a 'room_id' notification. */
export interface RoomIdNotificationParams {
  /** The ID of the room the player is currently in. */
  roomId: number;
}

/** A notification sent by the server to set the current room ID. */
export interface RoomIdNotification extends JsonRpcNotification {
  method: "room_id";
  params: RoomIdNotificationParams;
}

/** Parameters for a 'player_id' notification. */
export interface PlayerIdNotificationParams {
  /** The ID of the player entity. */
  playerId: number;
}

/** A notification sent by the server to set the player's entity ID. */
export interface PlayerIdNotification extends JsonRpcNotification {
  method: "player_id";
  params: PlayerIdNotificationParams;
}

// File Browser Message Types

/** A file/directory entry in a directory listing. */
export interface FileEntry {
  /** File or directory name (basename) */
  name: string;
  /** Absolute path */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** File size in bytes (undefined for directories) */
  size?: number;
  /** Last modified time as ISO 8601 string */
  mtime?: string;
  /** User-defined tags (from metadata overlay) */
  tags?: string[];
}

/** Parameters for a 'directory_listing' notification. */
export interface DirectoryListingParams {
  type: "directory_listing";
  /** Current directory path */
  path: string;
  /** List of entries in the directory */
  entries: FileEntry[];
}

/** A notification containing directory contents. */
export interface DirectoryListingNotification extends JsonRpcNotification {
  method: "directory_listing";
  params: DirectoryListingParams;
}

/** Parameters for a 'file_content' notification. */
export interface FileContentParams {
  type: "file_content";
  /** Full path to the file */
  path: string;
  /** File name (basename) */
  name: string;
  /** File contents as UTF-8 string */
  content: string;
  /** File size in bytes */
  size: number;
}

/** A notification containing file contents. */
export interface FileContentNotification extends JsonRpcNotification {
  method: "file_content";
  params: FileContentParams;
}

/** Parameters for a 'pwd' notification. */
export interface PwdParams {
  type: "pwd";
  /** Current working directory path */
  path: string;
}

/** A notification with the current working directory. */
export interface PwdNotification extends JsonRpcNotification {
  method: "pwd";
  params: PwdParams;
}

/** Parameters for bookmark-related notifications. */
export interface BookmarksParams {
  type: "bookmarks";
  /** Map of bookmark name to path */
  bookmarks: Record<string, string>;
}

/** A notification with user bookmarks. */
export interface BookmarksNotification extends JsonRpcNotification {
  method: "bookmarks";
  params: BookmarksParams;
}

/** Parameters for tag-related notifications. */
export interface TagsParams {
  type: "tags";
  /** Path the tags are for */
  path: string;
  /** List of tags */
  tags: string[];
}

/** A notification with tags for a path. */
export interface TagsNotification extends JsonRpcNotification {
  method: "tags";
  params: TagsParams;
}
