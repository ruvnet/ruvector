"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = exports.PluginManager = void 0;
class PluginManager {
    plugins;
    hooks;
    context;
    logger;
    constructor(context = {}) {
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
    async register(plugin) {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin ${plugin.name} is already registered`);
        }
        this.logger.info(`Registering plugin: ${plugin.name} v${plugin.version}`);
        try {
            await plugin.initialize(this.context);
            if (plugin.hooks) {
                this.registerHooks(plugin.name, plugin.hooks);
            }
            this.plugins.set(plugin.name, plugin);
            this.logger.info(`Plugin ${plugin.name} registered successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to register plugin ${plugin.name}:`, error);
            throw error;
        }
    }
    registerHooks(pluginName, hooks) {
        for (const [hookName, hookFn] of Object.entries(hooks)) {
            if (!this.hooks.has(hookName)) {
                this.hooks.set(hookName, []);
            }
            this.hooks.get(hookName).push(hookFn);
            this.logger.debug(`Registered hook ${hookName} for plugin ${pluginName}`);
        }
    }
    async unregister(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} is not registered`);
        }
        if (plugin.hooks) {
            for (const hookName of Object.keys(plugin.hooks)) {
                const hooks = this.hooks.get(hookName);
                if (hooks) {
                    const filtered = hooks.filter(fn => !Object.values(plugin.hooks).includes(fn));
                    this.hooks.set(hookName, filtered);
                }
            }
        }
        this.plugins.delete(pluginName);
        this.logger.info(`Plugin ${pluginName} unregistered`);
    }
    async executeHook(hookName, data) {
        const hookFns = this.hooks.get(hookName) || [];
        let result = data;
        for (const hookFn of hookFns) {
            try {
                result = await hookFn(result);
            }
            catch (error) {
                this.logger.error(`Error executing hook ${hookName}:`, error);
            }
        }
        return result;
    }
    getPlugin(name) {
        return this.plugins.get(name);
    }
    getPlugins() {
        return Array.from(this.plugins.values());
    }
    hasPlugin(name) {
        return this.plugins.has(name);
    }
    async callPluginApi(pluginName, methodName, ...args) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} is not registered`);
        }
        if (!plugin.api || !(methodName in plugin.api)) {
            throw new Error(`Plugin ${pluginName} does not have method ${methodName}`);
        }
        return plugin.api[methodName](...args);
    }
    createDefaultLogger() {
        return {
            debug: (message, meta) => {
                if (process.env.DEBUG) {
                    console.debug(`[DEBUG] ${message}`, meta || '');
                }
            },
            info: (message, meta) => {
                console.info(`[INFO] ${message}`, meta || '');
            },
            warn: (message, meta) => {
                console.warn(`[WARN] ${message}`, meta || '');
            },
            error: (message, meta) => {
                console.error(`[ERROR] ${message}`, meta || '');
            },
        };
    }
    updateContext(updates) {
        this.context = {
            ...this.context,
            ...updates,
        };
    }
}
exports.PluginManager = PluginManager;
function createPlugin(config) {
    return {
        name: config.name,
        version: config.version,
        description: config.description,
        initialize: config.initialize,
        hooks: config.hooks,
        api: config.api,
    };
}
exports.createPlugin = createPlugin;
//# sourceMappingURL=PluginManager.js.map