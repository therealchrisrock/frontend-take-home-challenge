"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { PresenceProvider } from "~/components/PresenceProvider";
import { Toaster } from "~/components/ui/toaster";
import { ChatProvider } from "~/contexts/ChatContext";
import { EventProvider } from "~/contexts/event-context";
import { SettingsProvider } from "~/contexts/settings-context";
import { MotionProvider } from "~/lib/motion";
import { SkinProvider } from "~/lib/skins/skin-context";
import { TRPCReactProvider } from "~/trpc/react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <SkinProvider>
          <MotionProvider>
            <TRPCReactProvider>
              <EventProvider>
                <PresenceProvider>
                  <ChatProvider>
                    {children}
                    <Toaster />
                  </ChatProvider>
                </PresenceProvider>
              </EventProvider>
            </TRPCReactProvider>
          </MotionProvider>
        </SkinProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}
