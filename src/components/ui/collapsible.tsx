"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "~/lib/utils";

interface CollapsibleContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | null>(null);

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({ 
  open: controlledOpen, 
  onOpenChange, 
  children, 
  className 
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    }
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function CollapsibleTrigger({ 
  asChild = false,
  onClick,
  children,
  ...props 
}: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error("CollapsibleTrigger must be used within Collapsible");
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context.onOpenChange(!context.open);
    onClick?.(e);
  };

  if (asChild) {
    return React.cloneElement(
      React.Children.only(children as React.ReactElement),
      { onClick: handleClick }
    );
  }

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

export function CollapsibleContent({ 
  children, 
  className,
  forceMount = false,
  ...props 
}: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error("CollapsibleContent must be used within Collapsible");
  }

  if (!context.open && !forceMount) {
    return null;
  }

  return (
    <div 
      className={cn(
        "overflow-hidden transition-all",
        !context.open && !forceMount && "hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}