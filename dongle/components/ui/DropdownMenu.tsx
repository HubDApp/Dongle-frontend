"use client";

import React, { useState, useRef, useEffect, Fragment } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  return <>{children}</>;
};

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

export const DropdownMenuTrigger = ({ asChild, children }: DropdownMenuTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        children.props.onClick?.(e);
      },
    });
  }
  return <>{children}</>;
};

interface DropdownMenuContentProps {
  align?: "start" | "center" | "end";
  children: React.ReactNode;
  className?: string;
}

export const DropdownMenuContent = ({ align = "end", children, className }: DropdownMenuContentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div className="relative inline-block" onClick={() => {}}>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {children}
      </button>
      {isOpen && (
        <Fragment>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            ref={contentRef}
            className={cn(
              "fixed z-50 min-w-[8rem] origin-top-right rounded-md bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 p-1",
              alignClasses[align],
              className,
            )}
            style={{ top: "100%", marginTop: "4px" }}
          >
            {children}
          </div>
        </Fragment>
      )}
    </div>
  );
};

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, inset, children, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-zinc-100 dark:focus:bg-zinc-700 focus:text-zinc-900 dark:focus:text-zinc-100",
          inset && "pl-8",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    ),
  );
);
DropdownMenuItem.displayName = "DropdownMenuItem";

interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSeparator = ({ className, ...props }: DropdownMenuSeparatorProps) => {
  return (
    <div className={cn("-mx-1 my-1 h-px bg-zinc-200 dark:bg-zinc-700", className)} {...props} />
  );
};