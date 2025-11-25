import type { Plugin, PluginContext, PluginHooks } from '../types';
export declare class PluginManager {
    private plugins;
    private hooks;
    private context;
    private logger;
    constructor(context?: Partial<PluginContext>);
    register(plugin: Plugin): Promise<void>;
    private registerHooks;
    unregister(pluginName: string): Promise<void>;
    executeHook<T>(hookName: keyof PluginHooks, data: T): Promise<T>;
    getPlugin(name: string): Plugin | undefined;
    getPlugins(): Plugin[];
    hasPlugin(name: string): boolean;
    callPluginApi(pluginName: string, methodName: string, ...args: any[]): Promise<any>;
    private createDefaultLogger;
    updateContext(updates: Partial<PluginContext>): void;
}
export declare function createPlugin(config: {
    name: string;
    version: string;
    description?: string;
    initialize: (context: PluginContext) => Promise<void>;
    hooks?: PluginHooks;
    api?: Record<string, Function>;
}): Plugin;
//# sourceMappingURL=PluginManager.d.ts.map