"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getGatewayForUrl, getIpfsGatewayUrls, cacheSuccessfulGateway, logGatewayFailure } from "@/lib/ipfs-gateway";

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
  const gatewayUrls = React.useMemo(() => (logoUrl ? getIpfsGatewayUrls(logoUrl) : []), [logoUrl]);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setGatewayIndex(0);
    setImgError(false);
  }, [logoUrl]);

  const imageUrl = gatewayUrls[gatewayIndex];
  const showImage = !!imageUrl && !imgError;

  const handleImageError = (error: unknown) => {
    if (!imageUrl) return;
    logGatewayFailure(imageUrl, error);
    if (gatewayIndex < gatewayUrls.length - 1) {
      setGatewayIndex((currentIndex) => currentIndex + 1);
    } else {
      setImgError(true);
    }
  };

  return (
    <div
      className={`w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden relative ${className}`}
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt={`${name} logo`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
          className="object-contain p-2"
          onLoad={() => {
            const gateway = imageUrl ? getGatewayForUrl(imageUrl) : undefined;
            if (gateway) cacheSuccessfulGateway(gateway);
          }}
          onError={handleImageError}
          priority={false}
        />
      ) : (
        <div
          role={logoUrl ? "img" : undefined}
          aria-label={logoUrl ? `${name} logo unavailable` : undefined}
          className={`absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold ${fallbackTextSize}`}
        >
          {logoUrl && imgError ? (
            <span className="flex flex-col items-center gap-1">
              <span>{name[0]?.toUpperCase()}</span>
              <span className="text-xs font-medium">Image unavailable</span>
            </span>
          ) : (
            name[0]?.toUpperCase()
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectImage;
