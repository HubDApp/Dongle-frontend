"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProjectImageProps {
  /** Remote URL of the project logo or screenshot */
  logoUrl?: string;
  /** Project name – used for the alt text and letter-avatar fallback */
  name: string;
  /** Extra Tailwind classes for the outer wrapper */
  className?: string;
  /** Text size class for the fallback letter (e.g. "text-lg" or "text-4xl") */
  fallbackTextSize?: string;
}

/**
 * Renders a project image using next/image when a `logoUrl` is available.
 * Falls back gracefully to a letter-avatar (first character of `name`) when:
 *  – `logoUrl` is empty / undefined
 *  – The image fails to load (onError)
 *
 * The wrapper is `aspect-video` so dimensions are always stable and
 * no layout shift occurs regardless of whether the image loads.
 */
export const ProjectImage = ({
  logoUrl,
  name,
  className = "",
  fallbackTextSize = "text-4xl",
}: ProjectImageProps) => {
  const [imgError, setImgError] = useState(false);

  const showImage = !!logoUrl && !imgError;

  return (
    <div
      className={`w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden relative ${className}`}
    >
      {showImage ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
          className="object-contain p-2"
          onError={() => setImgError(true)}
          priority={false}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold ${fallbackTextSize}`}
        >
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default ProjectImage;
