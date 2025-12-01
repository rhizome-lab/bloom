export interface JsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
  id: number | string;
}

export interface JsonRpcNotification<T = any> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
}

export interface JsonRpcSuccess<T = any> {
  jsonrpc: "2.0";
  result: T;
  id: number | string;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string | null;
}

export type JsonRpcResponse<T = any> = JsonRpcSuccess<T> | JsonRpcError;

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcResponse;

// Specific Notification Types

export interface MessageNotificationParams {
  type: "info" | "error";
  text: string;
}

export interface MessageNotification extends JsonRpcNotification {
  method: "message";
  params: MessageNotificationParams;
}

export interface Entity {
  id: number;
  [key: string]: unknown;
}

export interface UpdateNotificationParams {
  entities: Entity[];
}

export interface UpdateNotification extends JsonRpcNotification {
  method: "update";
  params: UpdateNotificationParams;
}

export interface RoomIdNotificationParams {
  roomId: number;
}

export interface RoomIdNotification extends JsonRpcNotification {
  method: "room_id";
  params: RoomIdNotificationParams;
}

export interface PlayerIdNotificationParams {
  playerId: number;
}

export interface PlayerIdNotification extends JsonRpcNotification {
  method: "player_id";
  params: PlayerIdNotificationParams;
}
