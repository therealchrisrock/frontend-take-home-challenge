"use client";

import { BoardIcon } from "~/components/ui/board-icon";
import { m } from "~/lib/motion";

interface AuthAsideProps {
    variant: "solid" | "board";
}

export function AuthAside({ variant }: AuthAsideProps) {
    return (
        <div className="relative h-full w-full">
            {variant === "solid" ? (
                <m.div
                    layoutId="auth-aside"
                    className="absolute inset-0 h-full w-full rounded-none bg-primary"
                />
            ) : (
                <m.div
                    layoutId="auth-aside"
                    className="absolute inset-0 flex h-full w-full items-center justify-center"
                >
                    <BoardIcon size={180} className="shadow-xl" skinId="the-og" showPieces={false} />
                </m.div>
            )}
        </div>
    );
}