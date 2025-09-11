"use client";

import React from "react";

type Props = { children: React.ReactNode };

export function GameWrapper({ children }: Props) {
  return (
    <div className="mx-auto h-full w-full max-w-7xl">
      <div className="flex h-full flex-col gap-2 md:gap-4 lg:grid lg:grid-cols-[1fr_485px] md:grid-cols-[1fr_400px] lg:gap-6">
        {children}
      </div>
    </div>
  );
}
