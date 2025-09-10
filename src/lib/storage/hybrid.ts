import {
  type GameStorageAdapter,
  type PersistedGameState,
  type GameSummary,
  type StorageResult,
  type StorageConfig
} from './types';

export class HybridStorageAdapter implements GameStorageAdapter {
  constructor(
    private primary: GameStorageAdapter,
    private secondary: GameStorageAdapter | null = null,
    private config: { 
      syncToSecondary?: boolean;
      preferPrimary?: boolean;
    } = {}
  ) {
    this.config = {
      syncToSecondary: config.syncToSecondary ?? true,
      preferPrimary: config.preferPrimary ?? true,
    };
  }

  async saveGame(gameState: PersistedGameState): Promise<StorageResult<void>> {
    // Always save to primary
    const primaryResult = await this.primary.saveGame(gameState);
    
    // If primary fails and we have secondary, try secondary
    if (!primaryResult.success && this.secondary) {
      const secondaryResult = await this.secondary.saveGame(gameState);
      if (secondaryResult.success) {
        console.warn('Primary storage failed, saved to secondary storage');
      }
      return secondaryResult;
    }
    
    // If primary succeeds and sync is enabled, sync to secondary
    if (primaryResult.success && this.secondary && this.config.syncToSecondary) {
      // Async sync - don't wait for it
      this.secondary.saveGame(gameState).catch(error => {
        console.warn('Failed to sync to secondary storage:', error);
      });
    }
    
    return primaryResult;
  }

  async loadGame(gameId?: string): Promise<StorageResult<PersistedGameState | null>> {
    if (this.config.preferPrimary) {
      // Try primary first
      const primaryResult = await this.primary.loadGame(gameId);
      
      if (primaryResult.success && primaryResult.data) {
        return primaryResult;
      }
      
      // If primary has no data or failed, try secondary
      if (this.secondary) {
        const secondaryResult = await this.secondary.loadGame(gameId);
        
        // If secondary has data, sync it back to primary
        if (secondaryResult.success && secondaryResult.data) {
          this.primary.saveGame(secondaryResult.data).catch(error => {
            console.warn('Failed to sync from secondary to primary:', error);
          });
          
          return secondaryResult;
        }
      }
      
      return primaryResult;
    } else {
      // Prefer secondary (e.g., prefer database over localStorage)
      if (this.secondary) {
        const secondaryResult = await this.secondary.loadGame(gameId);
        
        if (secondaryResult.success && secondaryResult.data) {
          // Sync to primary for offline access
          this.primary.saveGame(secondaryResult.data).catch(error => {
            console.warn('Failed to sync from secondary to primary:', error);
          });
          
          return secondaryResult;
        }
      }
      
      // Fallback to primary
      return await this.primary.loadGame(gameId);
    }
  }

  async deleteGame(gameId?: string): Promise<StorageResult<void>> {
    const results = await Promise.allSettled([
      this.primary.deleteGame(gameId),
      this.secondary?.deleteGame(gameId)
    ].filter(Boolean));
    
    const primaryResult = results[0];
    
    if (primaryResult && primaryResult.status === 'fulfilled' && primaryResult.value) {
      return primaryResult.value;
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'Failed to delete game from storage',
        originalError: primaryResult
      }
    };
  }

  async listGames(): Promise<StorageResult<GameSummary[]>> {
    // Combine games from both storages
    const results = await Promise.allSettled([
      this.primary.listGames(),
      this.secondary?.listGames()
    ].filter(Boolean));
    
    const allGames: GameSummary[] = [];
    const gameIds = new Set<string>();
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.success) {
        const data = (result.value as any).data;
        if (Array.isArray(data)) {
          for (const game of data) {
            if (!gameIds.has(game.id)) {
              gameIds.add(game.id);
              allGames.push(game);
            }
          }
        }
      }
    }
    
    // Sort by last saved
    allGames.sort((a, b) => 
      new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
    );
    
    return { success: true, data: allGames };
  }

  async autoSave(gameState: PersistedGameState): Promise<void> {
    // Auto-save to primary only (to avoid too many network requests)
    await this.primary.autoSave(gameState);
    
    // Optionally schedule a less frequent sync to secondary
    if (this.secondary && this.config.syncToSecondary) {
      // Could implement a debounced sync here
    }
  }

  async clearAll(): Promise<StorageResult<void>> {
    const results = await Promise.allSettled([
      this.primary.clearAll(),
      this.secondary?.clearAll()
    ].filter(Boolean));
    
    const primaryResult = results[0];
    
    if (primaryResult && primaryResult.status === 'fulfilled' && primaryResult.value) {
      return primaryResult.value;
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'Failed to clear storage',
        originalError: primaryResult
      }
    };
  }

  // Cleanup method
  destroy(): void {
    if ('destroy' in this.primary && typeof this.primary.destroy === 'function') {
      (this.primary as any).destroy();
    }
    
    if (this.secondary && 'destroy' in this.secondary && typeof this.secondary.destroy === 'function') {
      (this.secondary as any).destroy();
    }
  }

  // Utility method to sync all games from one storage to another
  async syncAll(fromPrimary = true): Promise<void> {
    if (!this.secondary) return;
    
    const source = fromPrimary ? this.primary : this.secondary;
    const target = fromPrimary ? this.secondary : this.primary;
    
    const gamesResult = await source.listGames();
    
    if (!gamesResult.success) return;
    
    for (const gameSummary of gamesResult.data) {
      const gameResult = await source.loadGame(gameSummary.id);
      
      if (gameResult.success && gameResult.data) {
        await target.saveGame(gameResult.data);
      }
    }
  }
}