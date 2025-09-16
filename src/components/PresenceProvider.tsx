"use client";

import { type ReactNode } from "react";
import { usePresenceHeartbeat } from "~/hooks/usePresenceHeartbeat";

export function PresenceProvider({ children }: { children: ReactNode }) {
  // Initialize presence heartbeat system
  usePresenceHeartbeat();
  
  return <>{children}</>;
}