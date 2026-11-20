"use client";

import React from "react";
import { type LocaleCode } from "@/lib/i18n/locales";

interface FlagProps {
  code: LocaleCode;
  className?: string;
}

/**
 * Flag component that renders an SVG flag for the given locale code.
 * Supported locales: en (US), es (Spain), pt (Brazil).
 * 
 * Flags are decorative (aria-hidden="true").
 * Respects prefers-reduced-motion (no animations).
 */
export function Flag({ code, className = "h-3 w-4" }: FlagProps) {
  switch (code) {
    case "en":
      return (
        <svg
          viewBox="0 0 640 480"
          className={className}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="#bd3d44" d="M0 0h640v480H0z" />
          <path
            stroke="#fff"
            strokeWidth="37"
            d="M0 55.5h640m-640 74h640m-640 74h640m-640 74h640m-640 74h640m-640 74h640"
          />
          <path fill="#192f5d" d="M0 0h364.8v258.5H0z" />
          <path
            fill="#fff"
            d="m31 17 4 12.7-10.7-7.8h13.3L27 29.7zm51 0 4 12.7-10.7-7.8h13.3L78 29.7zm51 0 4 12.7-10.7-7.8h13.3L129 29.7zm51 0 4 12.7-10.7-7.8h13.3L180 29.7zm51 0 4 12.7-10.7-7.8h13.3L231 29.7zm51 0 4 12.7-10.7-7.8h13.3L282 29.7zm-230 25 4 12.7-10.7-7.8h13.3L52 54.7zm51 0 4 12.7-10.7-7.8h13.3L103 54.7zm51 0 4 12.7-10.7-7.8h13.3L154 54.7zm51 0 4 12.7-10.7-7.8h13.3L205 54.7zm51 0 4 12.7-10.7-7.8h13.3L256 54.7zm51 0 4 12.7-10.7-7.8h13.3L307 54.7zm-230 25 4 12.7-10.7-7.8h13.3L27 79.7zm51 0 4 12.7-10.7-7.8h13.3L78 79.7zm51 0 4 12.7-10.7-7.8h13.3L129 79.7zm51 0 4 12.7-10.7-7.8h13.3L180 79.7zm51 0 4 12.7-10.7-7.8h13.3L231 79.7zm51 0 4 12.7-10.7-7.8h13.3L282 79.7zm-230 25 4 12.7-10.7-7.8h13.3L52 104.7zm51 0 4 12.7-10.7-7.8h13.3L103 104.7zm51 0 4 12.7-10.7-7.8h13.3L154 104.7zm51 0 4 12.7-10.7-7.8h13.3L205 104.7zm51 0 4 12.7-10.7-7.8h13.3L256 104.7zm51 0 4 12.7-10.7-7.8h13.3L307 104.7zm-230 25 4 12.7-10.7-7.8h13.3L27 129.7zm51 0 4 12.7-10.7-7.8h13.3L78 129.7zm51 0 4 12.7-10.7-7.8h13.3L129 129.7zm51 0 4 12.7-10.7-7.8h13.3L180 129.7zm51 0 4 12.7-10.7-7.8h13.3L231 129.7zm51 0 4 12.7-10.7-7.8h13.3L282 129.7zm-230 25 4 12.7-10.7-7.8h13.3L52 154.7zm51 0 4 12.7-10.7-7.8h13.3L103 154.7zm51 0 4 12.7-10.7-7.8h13.3L154 154.7zm51 0 4 12.7-10.7-7.8h13.3L205 154.7zm51 0 4 12.7-10.7-7.8h13.3L256 154.7zm51 0 4 12.7-10.7-7.8h13.3L307 154.7zm-230 25 4 12.7-10.7-7.8h13.3L27 179.7zm51 0 4 12.7-10.7-7.8h13.3L78 179.7zm51 0 4 12.7-10.7-7.8h13.3L129 179.7zm51 0 4 12.7-10.7-7.8h13.3L180 179.7zm51 0 4 12.7-10.7-7.8h13.3L231 179.7zm51 0 4 12.7-10.7-7.8h13.3L282 179.7zm-230 25 4 12.7-10.7-7.8h13.3L52 204.7zm51 0 4 12.7-10.7-7.8h13.3L103 204.7zm51 0 4 12.7-10.7-7.8h13.3L154 204.7zm51 0 4 12.7-10.7-7.8h13.3L205 204.7zm51 0 4 12.7-10.7-7.8h13.3L256 204.7zm51 0 4 12.7-10.7-7.8h13.3L307 204.7zm-230 25 4 12.7-10.7-7.8h13.3L27 229.7zm51 0 4 12.7-10.7-7.8h13.3L78 229.7zm51 0 4 12.7-10.7-7.8h13.3L129 229.7zm51 0 4 12.7-10.7-7.8h13.3L180 229.7zm51 0 4 12.7-10.7-7.8h13.3L231 229.7zm51 0 4 12.7-10.7-7.8h13.3L282 229.7z"
          />
        </svg>
      );
    case "es":
      return (
        <svg
          viewBox="0 0 640 480"
          className={className}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="#c60b1e" d="M0 0h640v480H0z" />
          <path fill="#ffc400" d="M0 120h640v240H0z" />
          <path
            fill="#c60b1e"
            d="M172 177h4v4h-4zm36 0h4v4h-4zm-36 72h4v4h-4zm36 0h4v4h-4z"
          />
          <path
            fill="#c60b1e"
            d="M170 175v78h44v-78h-44zm39 73h-34v-68h34v68z"
          />
          <path
            fill="#c60b1e"
            d="M192 153.5c-9.1 0-16.5 7.4-16.5 16.5h33c0-9.1-7.4-16.5-16.5-16.5z"
          />
        </svg>
      );
    case "pt":
      return (
        <svg
          viewBox="0 0 640 480"
          className={className}
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="#009b3a" d="M0 0h640v480H0z" />
          <path fill="#fedf00" d="M320 40 37 240l283 200 283-200z" />
          <circle fill="#3e4095" cx="320" cy="240" r="106" />
          <path
            fill="#fff"
            d="M214.3 245.5c22.5-35.7 75.7-43 118.8-16.3 35 21.7 61 57.6 61 57.6l10-10.5s-29.5-40-70-65c-51-31.5-113.8-21.5-140.5 21z"
          />
          <path
            fill="#fff"
            d="m325.5 292-1.5 3 2.7.3-2.3 1.5 1 2.7-2.3-1.6-2.3 1.6 1-2.7-2.3-1.5 2.7-.3-1.5-3z"
          />
        </svg>
      );
    default:
      return null;
  }
}
