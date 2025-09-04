export * from './types';
export { LocalStorageAdapter } from './local-storage';
export { DatabaseStorageAdapter } from './database';
export { HybridStorageAdapter } from './hybrid';
export { IndexedDBAdapter } from './indexeddb';

import { LocalStorageAdapter } from './local-storage';
import { DatabaseStorageAdapter } from './database';
import { HybridStorageAdapter } from './hybrid';
import { IndexedDBAdapter } from './indexeddb';
import { type GameStorageAdapter, type StorageConfig } from './types';
import { api } from '~/trpc/react';

export type StorageType = 'local' | 'database' | 'hybrid' | 'indexeddb';

export interface CreateStorageOptions extends StorageConfig {
  type?: StorageType;
  apiClient?: typeof api;
}

export function createStorageAdapter(
  options: CreateStorageOptions = {}
): GameStorageAdapter {
  const { type = 'indexeddb', apiClient = api, ...config } = options;
  
  switch (type) {
    case 'local':
      return new LocalStorageAdapter(config);
      
    case 'indexeddb':
      return new IndexedDBAdapter(config);
      
    case 'database':
      return new DatabaseStorageAdapter(apiClient, config);
      
    case 'hybrid':
      const primary = new IndexedDBAdapter(config);
      const secondary = new DatabaseStorageAdapter(apiClient, config);
      return new HybridStorageAdapter(primary, secondary, {
        syncToSecondary: true,
        preferPrimary: true // Prefer IndexedDB for better offline support
      });
      
    default:
      return new IndexedDBAdapter(config);
  }
}