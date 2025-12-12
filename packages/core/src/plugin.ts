import type { CoreInterface } from "./types";

/** Context representing a connected player. */
interface PlayerContext {
  id: number;
  ws: WebSocket;
}

/**
 * Context passed to command handlers.
 * Provides access to the player, the command arguments, and core API methods.
 */
export interface CommandContext {
  player: PlayerContext;
  command: string;
  args: any[];
  send: (type: string, payload: unknown) => void;
}

/**
 * Interface that all plugins must implement.
 */
export interface Plugin {
  name: string;
  version: string;
  /** Called when the plugin is loaded. Use this to register commands. */
  onLoad: (ctx: PluginContext) => void | Promise<void>;
  /** Called when the plugin is unloaded. Clean up resources here. */
  onUnload?: () => void | Promise<void>;
}

/**
 * Context passed to the plugin's onLoad method.
 * Allows the plugin to interact with the core system.
 */
export interface PluginContext {
  /** Registers a new command handler */
  registerCommand: (
    command: string,
    handler: (ctx: CommandContext) => void | Promise<void>,
  ) => void;
  /** Registers a new RPC method */
  registerRpcMethod: (
    method: string,
    handler: (params: any, ctx: CommandContext) => Promise<any>,
  ) => void;
  /** Gets a currently active plugin by name. */
  getPlugin: (name: string) => Plugin | undefined;
  /** Core interface for accessing system functionality */
  core: CoreInterface;
}

/** Manages the lifecycle of plugins and delegates commands to them. */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private commands = new Map<string, (ctx: CommandContext) => void | Promise<void>>();
  private rpcMethods = new Map<string, (params: any, ctx: CommandContext) => Promise<any>>();
  private core: CoreInterface;

  constructor(core: CoreInterface) {
    this.core = core;
  }

  /**
   * Loads a plugin and registers its commands.
   *
   * @param plugin - The plugin to load.
   */
  async loadPlugin(plugin: Plugin) {
    console.log(`Loading plugin: ${plugin.name} v${plugin.version}`);
    const context: PluginContext = {
      core: this.core,
      getPlugin: (name) => this.plugins.get(name),
      registerCommand: (cmd, handler) => {
        console.log(`Plugin '${plugin.name}' registered command: ${cmd}`);
        this.commands.set(cmd, handler);
      },
      registerRpcMethod: (method, handler) => {
        console.log(`Plugin '${plugin.name}' registered RPC method: ${method}`);
        this.rpcMethods.set(method, handler);
      },
    };

    await plugin.onLoad(context);
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Delegates a command to the registered handler.
   *
   * @param ctx - The command context.
   * @returns True if the command was handled, false otherwise.
   */
  async handleCommand(ctx: CommandContext): Promise<boolean> {
    const handler = this.commands.get(ctx.command);
    if (handler) {
      await handler(ctx);
      return true;
    }
    return false;
  }

  /**
   * Delegates an RPC method call to the registered handler.
   *
   * @param method - The RPC method name.
   * @param params - The parameters for the method.
   * @param ctx - The command context (reused for RPC to provide player/core access).
   * @returns The result of the RPC call.
   */
  async handleRpcMethod(method: string, params: any, ctx: CommandContext): Promise<any> {
    const handler = this.rpcMethods.get(method);
    if (handler) {
      return await handler(params, ctx);
    }
    throw new Error(`RPC method '${method}' not found.`);
  }

  /**
   * Returns metadata about all registered capability classes.
   * This allows the block editor to auto-generate blocks from capability methods.
   *
   * @returns An array of capability metadata objects.
   */
  getCapabilityMetadata() {
    // For now, return metadata for core capabilities
    // Later, plugins can extend this by registering their own capabilities
    return [
      {
        description: "Image generation using diffusers",
        label: "Diffusers Generate",
        methods: [
          {
            description: "Generate an image from a text prompt",
            label: "Text to Image",
            name: "textToImage",
            parameters: [
              { description: "The text prompt", name: "prompt", type: "string" },
              {
                fields: [
                  { name: "negativePrompt", optional: true, type: "string" },
                  { default: 512, name: "width", optional: true, type: "number" },
                  { default: 512, name: "height", optional: true, type: "number" },
                  { default: 30, name: "numInferenceSteps", optional: true, type: "number" },
                  { default: 7.5, name: "guidanceScale", optional: true, type: "number" },
                  { name: "seed", optional: true, type: "number" },
                ],
                name: "options",
                optional: true,
                type: "object",
              },
            ],
            returnType: "Promise<string>",
          },
        ],
        type: "diffusers.generate",
      },
      {
        description: "Control entity operations",
        label: "Entity Control",
        methods: [
          {
            description: "Destroys an entity",
            label: "Destroy Entity",
            name: "destroy",
            parameters: [{ description: "Entity ID to destroy", name: "targetId", type: "number" }],
            returnType: "boolean",
          },
          {
            description: "Updates entity properties",
            label: "Update Entity",
            name: "update",
            parameters: [
              { description: "Entity ID to update", name: "targetId", type: "number" },
              { description: "Properties to update", name: "updates", type: "object" },
            ],
            returnType: "Entity",
          },
        ],
        type: "entity.control",
      },
      {
        description: "Create new entities",
        label: "System Create",
        methods: [
          {
            description: "Creates a new entity",
            label: "Create Entity",
            name: "create",
            parameters: [{ description: "Entity data", name: "data", type: "object" }],
            returnType: "number",
          },
        ],
        type: "sys.create",
      },
    ];
  }
}
