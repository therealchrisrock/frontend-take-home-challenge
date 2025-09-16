import React from "react";

type Props = { children: React.ReactNode };

export function GameWrapper({ children }: Props) {
  return (
    <div className="mx-auto w-full max-w-7xl lg:h-full">
      <div className="flex flex-col gap-2 md:gap-4 lg:grid lg:grid-cols-[1fr_485px] md:grid-cols-[1fr_400px] lg:gap-6 lg:h-full">
        {children}
      </div>
    </div>
  );
}
