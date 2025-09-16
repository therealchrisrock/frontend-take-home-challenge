"use client";

import { type ReactNode } from "react";
import { AnimatePresence, LayoutGroup } from "~/lib/motion";

export function AuthTransitionProvider({ children }: { children: ReactNode }) {
    return (
        <LayoutGroup id="auth-shared">
            <AnimatePresence mode="wait" initial={false}>{children}</AnimatePresence>
        </LayoutGroup>
    );
}