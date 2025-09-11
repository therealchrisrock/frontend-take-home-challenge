export { GuestSessionManager } from './GuestSessionManager';
export { PostGameAccountFlow } from './PostGameAccountFlow';
export { default as GuestSessionManager } from './GuestSessionManager';
export { default as PostGameAccountFlow } from './PostGameAccountFlow';

// Re-export types from the guest session system
export type { 
  GuestSessionData, 
  GuestGameRecord, 
  GuestConversionData 
} from '~/lib/game/guest-session';