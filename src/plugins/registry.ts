import { Plugin, PluginHooks } from './types';
import { logger } from '../utils/logger';

class PluginRegistry {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn('Plugin already registered, replacing', { name: plugin.name });
    }
    this.plugins.set(plugin.name, plugin);
    logger.info('Plugin registered', { name: plugin.name, version: plugin.version });
  }

  unregister(name: string): void {
    this.plugins.delete(name);
    logger.info('Plugin unregistered', { name });
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      const hook = plugin.hooks?.[hookName];
      if (hook) {
        try {
          await (hook as any)(...args);
        } catch (err) {
          logger.error('Plugin hook error', {
            plugin: name,
            hook: hookName,
            error: (err as Error).message,
          });
        }
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
