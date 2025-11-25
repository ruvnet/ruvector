import type { Plugin, PluginContext, PluginHooks, Logger } from '../types';

/**
 * Plugin system for extending genomic vector analysis capabilities
 *
 * Provides a flexible, hook-based architecture for extending functionality without
 * modifying core code. Supports lifecycle hooks, custom API methods, and context sharing.
 *
 * @category Plugins
 *
 * @example Basic plugin
 * ```typescript
 * const annotator = createPlugin({
 *   name: 'variant-annotator',
 *   version: '1.0.0',
 *   description: 'Adds clinical annotations to variants',
 *
 *   async initialize(context) {
 *     console.log('Plugin initialized with:', context.config);
 *   },
 *
 *   hooks: {
 *     async afterSearch(results) {
 *       // Annotate search results
 *       return results.map(r => ({
 *         ...r,
 *         metadata: {
 *           ...r.metadata,
 *           clinicalSignificance: 'Pathogenic'
 *         }
 *       }));
 *     }
 *   }
 * });
 *
 * const manager = new PluginManager({ db, embeddings });
 * await manager.register(annotator);
 * ```
 *
 * @example Plugin with custom API
 * ```typescript
 * const customPlugin = createPlugin({
 *   name: 'custom-analysis',
 *   version: '1.0.0',
 *
 *   async initialize(context) {
 *     // Setup
 *   },
 *
 *   api: {
 *     async analyzeVariant(variant) {
 *       // Custom analysis logic
 *       return { score: 0.95, confidence: 'high' };
 *     }
 *   }
 * });
 *
 * await manager.register(customPlugin);
 * const result = await manager.callPluginApi(
 *   'custom-analysis',
 *   'analyzeVariant',
 *   variant
 * );
 * ```
 *
 * @remarks
 * Available hooks (execution order):
 * 1. beforeEmbed - Pre-process data before embedding
 * 2. afterEmbed - Post-process embedding results
 * 3. beforeSearch - Modify search queries
 * 4. afterSearch - Post-process search results
 * 5. beforeTrain - Pre-process training data
 * 6. afterTrain - Post-process training metrics
 *
 * Plugin lifecycle:
 * 1. Create plugin with createPlugin()
 * 2. Register with manager.register()
 * 3. Hooks execute automatically
 * 4. Use custom API via callPluginApi()
 * 5. Unregister with manager.unregister()
 */
export class PluginManager {
  private plugins: Map<string, Plugin>;
  private hooks: Map<keyof PluginHooks, Function[]>;
  private context: PluginContext;
  private logger: Logger;

  constructor(context: Partial<PluginContext> = {}) {
    this.plugins = new Map();
    this.hooks = new Map();

    this.logger = context.logger || this.createDefaultLogger();

    this.context = {
      db: context.db,
      embeddings: context.embeddings,
      config: context.config || {},
      logger: this.logger,
    };
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    this.logger.info(`Registering plugin: ${plugin.name} v${plugin.version}`);

    // Initialize plugin
    try {
      await plugin.initialize(this.context);

      // Register hooks
      if (plugin.hooks) {
        this.registerHooks(plugin.name, plugin.hooks);
      }

      this.plugins.set(plugin.name, plugin);
      this.logger.info(`Plugin ${plugin.name} registered successfully`);
    } catch (error) {
      this.logger.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Register plugin hooks
   */
  private registerHooks(pluginName: string, hooks: PluginHooks): void {
    for (const [hookName, hookFn] of Object.entries(hooks)) {
      if (!this.hooks.has(hookName as keyof PluginHooks)) {
        this.hooks.set(hookName as keyof PluginHooks, []);
      }

      this.hooks.get(hookName as keyof PluginHooks)!.push(hookFn);
      this.logger.debug(`Registered hook ${hookName} for plugin ${pluginName}`);
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    // Remove hooks
    if (plugin.hooks) {
      for (const hookName of Object.keys(plugin.hooks)) {
        const hooks = this.hooks.get(hookName as keyof PluginHooks);
        if (hooks) {
          const filtered = hooks.filter(fn => !Object.values(plugin.hooks!).includes(fn));
          this.hooks.set(hookName as keyof PluginHooks, filtered);
        }
      }
    }

    this.plugins.delete(pluginName);
    this.logger.info(`Plugin ${pluginName} unregistered`);
  }

  /**
   * Execute a hook
   */
  async executeHook<T>(hookName: keyof PluginHooks, data: T): Promise<T> {
    const hookFns = this.hooks.get(hookName) || [];

    let result = data;
    for (const hookFn of hookFns) {
      try {
        result = await hookFn(result);
      } catch (error) {
        this.logger.error(`Error executing hook ${hookName}:`, error);
        // Continue with other hooks
      }
    }

    return result;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Call a plugin API method
   */
  async callPluginApi(
    pluginName: string,
    methodName: string,
    ...args: any[]
  ): Promise<any> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    if (!plugin.api || !(methodName in plugin.api)) {
      throw new Error(`Plugin ${pluginName} does not have method ${methodName}`);
    }

    return plugin.api[methodName](...args);
  }

  /**
   * Create default logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        if (process.env.DEBUG) {
          console.debug(`[DEBUG] ${message}`, meta || '');
        }
      },
      info: (message: string, meta?: any) => {
        console.info(`[INFO] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${message}`, meta || '');
      },
    };
  }

  /**
   * Update plugin context
   */
  updateContext(updates: Partial<PluginContext>): void {
    this.context = {
      ...this.context,
      ...updates,
    };
  }
}

/**
 * Factory function to create a plugin with type safety
 *
 * @param config - Plugin configuration
 * @param config.name - Unique plugin name
 * @param config.version - Semantic version
 * @param config.description - Plugin description
 * @param config.initialize - Initialization function
 * @param config.hooks - Optional lifecycle hooks
 * @param config.api - Optional custom API methods
 *
 * @returns Plugin object ready for registration
 *
 * @example Complete plugin
 * ```typescript
 * const myPlugin = createPlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My custom plugin',
 *
 *   async initialize(context) {
 *     context.logger.info('Initializing my plugin');
 *     // Setup logic
 *   },
 *
 *   hooks: {
 *     async beforeEmbed(data) {
 *       // Pre-process
 *       return data;
 *     },
 *     async afterSearch(results) {
 *       // Post-process
 *       return results;
 *     }
 *   },
 *
 *   api: {
 *     async customMethod(args) {
 *       // Custom functionality
 *       return result;
 *     }
 *   }
 * });
 *
 * await pluginManager.register(myPlugin);
 * ```
 *
 * @see {@link PluginManager.register} for registration
 * @see {@link PluginHooks} for available hooks
 */
export function createPlugin(config: {
  name: string;
  version: string;
  description?: string;
  initialize: (context: PluginContext) => Promise<void>;
  hooks?: PluginHooks;
  api?: Record<string, Function>;
}): Plugin {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    initialize: config.initialize,
    hooks: config.hooks,
    api: config.api,
  };
}
