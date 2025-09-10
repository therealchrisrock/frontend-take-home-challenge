"use client";

import Image from "next/image";
import React from "react";

interface AuthLayoutProps {
  imageSrc: string;
  imageAlt?: string;
  reverse?: boolean;
  children: React.ReactNode;
  brandName?: string;
  brandHref?: string;
}

export default function AuthLayout({
  imageSrc,
  imageAlt = "",
  reverse = false,
  children,
  brandName = "",
  brandHref = "/",
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
              height={200}
            />
          </div>
          {/* Centered content */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">{children}</div>
          </div>
        </div>
      </div>
      {/* Image column */}
      <div
        className={`bg-muted relative hidden lg:block ${reverse ? "order-1 lg:order-1" : "order-2 lg:order-2"}`}
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 1024px) 0px, 50vw"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
