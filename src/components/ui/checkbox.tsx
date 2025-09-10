"use client"

import * as React from "react"
import { m, useMotionValue, useTransform } from "framer-motion"
import { cn } from "~/lib/utils"

export type CheckboxProps = {
  id?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: number
  strokeWidth?: number
  "aria-label"?: string
  "aria-labelledby"?: string
}

// Variants adapted from the provided example
const tickVariants = {
  pressed: (isChecked: boolean) => ({ pathLength: isChecked ? 0.85 : 0.2 }),
  checked: { pathLength: 1 },
  unchecked: { pathLength: 0 },
}

const boxVariants = {
  hover: { scale: 1.05, strokeWidth: 60 },
  pressed: { scale: 0.95, strokeWidth: 35 },
  checked: { stroke: "#FF008C" },
  unchecked: { stroke: "#ddd", strokeWidth: 50 },
  disabled: { opacity: 0.5 },
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      id,
      checked: controlledChecked,
      defaultChecked,
      onCheckedChange,
      disabled = false,
      className,
      size = 20,
      strokeWidth = 65, // used by tick paths from the example
      ...rest
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(
      defaultChecked ?? false
    )
    const isControlled = controlledChecked !== undefined
    const checked = isControlled ? Boolean(controlledChecked) : uncontrolledChecked

    const toggle = () => {
      if (disabled) return
      if (!isControlled) setUncontrolledChecked((v) => !v)
      onCheckedChange?.(!checked)
    }

    // Coordinate system from the provided SVG example (kept constant)
    const viewBoxSize = 440

    // Motion values for the tick opacity based on drawn length
    const pathLength = useMotionValue(0)
    const opacity = useTransform(pathLength, [0.05, 0.15], [0, 1])

    return (
      <button
        id={id}
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "group inline-flex select-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
          className
        )}
        {...rest}
     >
        <m.svg
          initial={false}
          animate={disabled ? "disabled" : checked ? "checked" : "unchecked"}
          whileHover={disabled ? undefined : "hover"}
          whileTap={disabled ? undefined : "pressed"}
          width={size}
          height={size}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="block"
        >
          <m.path
            d="M 72 136 C 72 100.654 100.654 72 136 72 L 304 72 C 339.346 72 368 100.654 368 136 L 368 304 C 368 339.346 339.346 368 304 368 L 136 368 C 100.654 368 72 339.346 72 304 Z"
            fill="transparent"
            strokeWidth="50"
            stroke="#FF008C"
            variants={boxVariants}
          />
          <m.path
            d="M 0 128.666 L 128.658 257.373 L 341.808 0"
            transform="translate(54.917 88.332) rotate(-4 170.904 128.687)"
            fill="transparent"
            strokeWidth={strokeWidth}
            stroke="hsl(0, 0%, 100%)"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={tickVariants}
            style={{ pathLength, opacity }}
            custom={checked}
          />
          <m.path
            d="M 0 128.666 L 128.658 257.373 L 341.808 0"
            transform="translate(54.917 68.947) rotate(-4 170.904 128.687)"
            fill="transparent"
            strokeWidth={strokeWidth}
            stroke="#7700FF"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={tickVariants}
            style={{ pathLength, opacity }}
            custom={checked}
          />
        </m.svg>
      </button>
    )
  }
)

Checkbox.displayName = "Checkbox"

export default Checkbox