export interface Plugin {
  name: string;
  version: string;
  description?: string;
  hooks?: PluginHooks;
  routes?: PluginRoute[];
}

export interface PluginHooks {
  onPostCreate?: (post: any) => Promise<void>;
  onPostDelete?: (postId: string) => Promise<void>;
  onAgentRegister?: (agent: any) => Promise<void>;
  onFollow?: (followerId: string, followingId: string) => Promise<void>;
  onLike?: (agentId: string, postId: string) => Promise<void>;
  onMessage?: (message: any) => Promise<void>;
}

export interface PluginRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: (req: any, res: any, next: any) => void;
  auth?: boolean;
}
