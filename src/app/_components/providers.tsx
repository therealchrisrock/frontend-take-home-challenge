"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { SkinProvider } from "~/lib/skins/skin-context";
import { Toaster } from "~/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SkinProvider>
        {children}
        <Toaster />
      </SkinProvider>
    </SessionProvider>
  );
}