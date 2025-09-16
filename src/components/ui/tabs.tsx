"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { m, AnimatePresence, LayoutGroup } from "framer-motion";

import { cn } from "~/lib/utils";
import { tabContent } from "~/lib/motion/variants";

// Underline variant context to coordinate active value and animated indicator
type UnderlineTabsContextValue = {
  activeValue?: string;
  setActiveValue: (value: string) => void;
  underlineColor: string;
  layoutId: string;
};

const UnderlineTabsContext =
  React.createContext<UnderlineTabsContextValue | null>(null);

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className,
      )}
      {...props}
    >
      <LayoutGroup>{children}</LayoutGroup>
    </TabsPrimitive.List>
  );
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const [isActive, setIsActive] = React.useState(false);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      {...props}
    >
      {isActive && (
        <m.div
          layoutId="activeTab"
          className="bg-background dark:border-input dark:bg-input/30 absolute inset-0 rounded-md border shadow-sm"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof m.div>,
  React.ComponentPropsWithoutRef<typeof m.div> & {
    value: string;
    forceMount?: true;
  }
>(({ className, value, forceMount, ...props }, ref) => (
  <TabsPrimitive.Content
    value={value}
    forceMount={forceMount ? true : undefined}
    asChild
  >
    <AnimatePresence mode="wait">
      <m.div
        ref={ref}
        key={value}
        data-slot="tabs-content"
        variants={tabContent}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("flex-1 outline-none", className)}
        {...props}
      />
    </AnimatePresence>
  </TabsPrimitive.Content>
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };

// Underline Tabs Variant
// A variant of Tabs that renders uppercase triggers with an animated underline indicator.
// Each instance gets a unique layoutId by default to prevent animation conflicts.

type TabsUnderlineProps = React.ComponentProps<typeof TabsPrimitive.Root> & {
  underlineColor?: string;
  layoutId?: string;
};

function TabsUnderline({
  className,
  underlineColor = "#7c3aed",
  layoutId,
  value,
  defaultValue,
  onValueChange,
  ...props
}: TabsUnderlineProps) {
  // Generate a stable unique ID for this instance if layoutId not provided
  const generatedId = React.useRef(
    `tabs-underline-${Math.random().toString(36).substr(2, 9)}`
  );
  const effectiveLayoutId = layoutId ?? generatedId.current;
  
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    value ?? defaultValue,
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <UnderlineTabsContext.Provider
      value={{
        activeValue: value ?? internalValue,
        setActiveValue: (v) => handleChange(v),
        underlineColor,
        layoutId: effectiveLayoutId,
      }}
    >
      <TabsPrimitive.Root
        data-slot="tabs-underline"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleChange}
        {...props}
      />
    </UnderlineTabsContext.Provider>
  );
}

function TabsUnderlineList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-underline-list"
      className={cn("relative flex w-full items-end gap-0 px-4", className)}
      {...props}
    >
      <LayoutGroup>{children}</LayoutGroup>
      <div className="absolute inset-x-4 bottom-0 h-px bg-gray-200" />
    </TabsPrimitive.List>
  );
}

const TabsUnderlineTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(UnderlineTabsContext);
  const isActive = ctx?.activeValue === value;
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      data-slot="tabs-underline-trigger"
      className={cn(
        "relative flex-1 pb-3 text-center text-sm font-semibold tracking-wide uppercase",
        isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600",
        className,
      )}
      onFocus={() => ctx?.setActiveValue?.(String(value))}
      {...props}
    >
      {isActive && (
        <m.span
          layoutId={ctx?.layoutId ?? "drawer-underline"}
          className="absolute bottom-0 left-0 h-1 w-full rounded"
          style={{ backgroundColor: ctx?.underlineColor ?? "#7c3aed" }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsUnderlineTrigger.displayName = "TabsUnderlineTrigger";

export { TabsUnderline, TabsUnderlineList, TabsUnderlineTrigger };
