"use client";

/**
 * Direction-aware icon wrapper for forms (Issue #546).
 * Mirrors chevrons/arrows in RTL while leaving symmetric icons alone.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { mirrorIconClass, type FormTextDirection } from "@/lib/forms/rtl";
import { useFormRtl } from "./FormRtlProvider";

export interface FormIconProps {
  /** Logical icon name used to decide mirroring (e.g. "chevron-left"). */
  name?: string;
  /** Force direction instead of reading form context. */
  dir?: FormTextDirection;
  className?: string;
  children: React.ReactElement<{ className?: string }>;
}

export function FormIcon({ name, dir, className, children }: FormIconProps) {
  const ctx = useFormRtl();
  const direction = dir ?? ctx.dir;
  const mirror = mirrorIconClass(name, direction);

  return React.cloneElement(children, {
    className: cn(children.props.className, mirror, className),
  });
}

export default FormIcon;
