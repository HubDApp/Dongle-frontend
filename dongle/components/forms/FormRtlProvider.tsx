"use client";

/**
 * Provides RTL/LTR context for form trees (Issue #546).
 */

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  formDirectionProps,
  formRtlClasses,
  isFormRtl,
  resolveFormDirection,
  type FormTextDirection,
} from "@/lib/forms/rtl";

interface FormRtlContextValue {
  dir: FormTextDirection;
  isRtl: boolean;
  locale?: string;
  classes: ReturnType<typeof formRtlClasses>;
}

const FormRtlContext = createContext<FormRtlContextValue>({
  dir: "ltr",
  isRtl: false,
  classes: formRtlClasses("ltr"),
});

export interface FormRtlProviderProps {
  children: ReactNode;
  /** Force direction regardless of locale. */
  dir?: FormTextDirection;
  /**
   * Locale used to resolve direction when `dir` is omitted.
   * Pass an RTL locale such as `ar` or `he` to flip the form.
   */
  locale?: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function FormRtlProvider({
  children,
  dir: dirOverride,
  locale,
  className = "",
  as: Tag = "div",
}: FormRtlProviderProps) {
  const dir = resolveFormDirection({ dir: dirOverride, locale });
  const value = useMemo<FormRtlContextValue>(
    () => ({
      dir,
      isRtl: dir === "rtl",
      locale,
      classes: formRtlClasses(dir),
    }),
    [dir, locale],
  );

  const directionProps = formDirectionProps({ dir, locale });

  return (
    <FormRtlContext.Provider value={value}>
      <Tag
        {...directionProps}
        className={`dongle-form ${value.classes.root} ${className}`.trim()}
      >
        {children}
      </Tag>
    </FormRtlContext.Provider>
  );
}

export function useFormRtl(): FormRtlContextValue {
  return useContext(FormRtlContext);
}

export function useIsFormRtl(): boolean {
  return useFormRtl().isRtl;
}

/** Convenience when a provider is not mounted — reads document/locale. */
export function peekFormRtl(locale?: string): boolean {
  return isFormRtl({ locale });
}
