"use client";

import Image from "next/image";
import React from "react";
import { m } from "~/lib/motion";
import { slideInFromLeft, slideInFromRight } from "~/lib/motion/variants";

interface AuthLayoutProps {
  aside?: React.ReactNode;
  reverse?: boolean;
  children: React.ReactNode;
  brandName?: string;
  brandHref?: string;
}

export default function AuthLayout({
  aside,
  reverse = false,
  children,
  brandName = "",
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Form column */}
      <div className={reverse ? "order-2 lg:order-2" : "order-1 lg:order-1"}>
        <div className="flex h-full flex-col gap-4 p-6 md:p-10">
          {/* Brand header */}
          <div className="flex justify-center gap-2 md:justify-start">
            <Image
              src="/logo.png"
              alt={brandName || "brand"}
              width={200}
              height={57}
              priority
            />
          </div>
          {/* Centered content */}
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <m.div
              key={reverse ? "form-right" : "form-left"}
              variants={reverse ? slideInFromRight : slideInFromLeft}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-xs"
            >
              {children}
            </m.div>
          </div>
        </div>
      </div>
      {/* Aside column */}
      {aside && (
        <div
          className={`bg-muted relative hidden lg:block ${reverse ? "order-1 lg:order-1" : "order-2 lg:order-2"}`}
        >
          {aside}
        </div>
      )}
    </div>
  );
}
