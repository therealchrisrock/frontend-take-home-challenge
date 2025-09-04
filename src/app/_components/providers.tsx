"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { SkinProvider } from "~/lib/skins/skin-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SkinProvider>
        {children}
      </SkinProvider>
    </SessionProvider>
  );
}