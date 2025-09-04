import type { Move } from '~/lib/game-logic';

export type TabId = string;
export type GameId = string;

export interface TabSession {
  id: TabId;
  controller?: ReadableStreamDefaultController;
  lastSeen: Date;
  isActive: boolean;
}

export interface GameSession {
  gameId: GameId;
  tabs: Map<TabId, TabSession>;
  activeTabId: TabId | null;
  lastMove: Date;
  version: number;
}

export type SyncEventType = 
  | 'INITIAL_STATE'
  | 'MOVE_APPLIED'
  | 'TAB_STATUS_UPDATE'
  | 'ACTIVE_TAB_CHANGED'
  | 'CONFLICT_RESOLVED'
  | 'HEARTBEAT'
  | 'CONNECTION_STATUS';

export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  payload: T;
  timestamp: string;
  gameId: GameId;
  tabId?: TabId;
}

export interface InitialStatePayload {
  board: unknown[][];
  currentPlayer: 'red' | 'black';
  moveCount: number;
  winner: 'red' | 'black' | 'draw' | null;
  gameStartTime: string;
  version: number;
}

export interface MoveAppliedPayload {
  move: Move;
  newGameState: InitialStatePayload;
  optimisticMoveId?: string;
}

export interface TabStatusUpdatePayload {
  activeTabId: TabId | null;
  totalTabs: number;
}

export interface ConflictResolvedPayload {
  winningMove: Move;
  rejectedMoves: Move[];
  resolutionStrategy: 'first-write-wins' | 'last-write-wins';
}

export type OptimisticUpdate = {
  id: string;
  move: Move;
  timestamp: Date;
  applied: boolean;
};

export interface MultiTabState {
  tabId: TabId;
  isConnected: boolean;
  isActiveTab: boolean;
  totalTabs: number;
  connectionAttempts: number;
  lastHeartbeat: Date | null;
  optimisticUpdates: OptimisticUpdate[];
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  offlineMoveCount?: number;
}