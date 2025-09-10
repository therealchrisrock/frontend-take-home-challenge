'use client';

import React from 'react';

type Props = { children: React.ReactNode };

export function GameWrapper({ children }: Props) {
  return (
    <div className="w-full h-full max-w-7xl mx-auto">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_485px] gap-2 md:gap-4 lg:gap-6 h-full">
        {children}
      </div>
    </div>
  );
}

