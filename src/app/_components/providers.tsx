"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { SkinProvider } from "~/lib/skins/skin-context";
import { MotionProvider } from "~/lib/motion";
import { SettingsProvider } from "~/contexts/settings-context";
import { Toaster } from "~/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <SkinProvider>
          <MotionProvider>
            {children}
            <Toaster />
          </MotionProvider>
        </SkinProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}