"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getGatewayForUrl, getIpfsGatewayUrls, cacheSuccessfulGateway, logGatewayFailure } from "@/lib/ipfs-gateway";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export interface ProjectImageProps {
  /** Remote URL of the project logo or screenshot */
  logoUrl?: string;
  /** Project name – used for the alt text and letter-avatar fallback */
  name: string;
  /** Description for screenshots; defaults to the project logo label. */
  alt?: string;
  /** Extra Tailwind classes for the outer wrapper */
  className?: string;
  /** Text size class for the fallback letter (e.g. "text-lg" or "text-4xl") */
  fallbackTextSize?: string;
  /** If true, skips lazy load (e.g. for above-the-fold images) */
  priority?: boolean;
}

/**
 * Renders a project image using next/image with Intersection Observer lazy loading.
 * Falls back gracefully to a letter-avatar (first character of `name`) when:
 *  – `logoUrl` is empty / undefined
 *  – The image fails to load (onError)
 *
 * Shows an animated placeholder skeleton while loading, then smoothly fades in.
 * Off-screen images below the viewport defer loading until scrolled into view.
 */
export const ProjectImage = ({
  logoUrl,
  name,
  alt = `${name} logo`,
  className = "",
  fallbackTextSize = "text-4xl",
  priority = false,
}: ProjectImageProps) => {
  const gatewayUrls = React.useMemo(() => (logoUrl ? getIpfsGatewayUrls(logoUrl) : []), [logoUrl]);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: "200px",
    triggerOnce: true,
  });

  const shouldLoad = priority || isIntersecting;

  React.useEffect(() => {
    setGatewayIndex(0);
    setImgError(false);
    setIsLoaded(false);
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
      ref={ref}
      className={`w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden relative ${className}`}
    >
      {/* Placeholder shown while loading */}
      {showImage && shouldLoad && !isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse flex items-center justify-center transition-opacity duration-300"
        >
          <span className="text-zinc-400 dark:text-zinc-600 font-bold opacity-30 select-none">
            {name[0]?.toUpperCase()}
          </span>
        </div>
      )}

      {showImage ? (
        shouldLoad ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
            className={`object-contain p-2 transition-opacity duration-500 ease-in-out ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => {
              setIsLoaded(true);
              const gateway = imageUrl ? getGatewayForUrl(imageUrl) : undefined;
              if (gateway) cacheSuccessfulGateway(gateway);
            }}
            onError={handleImageError}
            priority={priority}
          />
        ) : (
          /* Placeholder shown before image enters viewport */
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
          >
            <span className="text-zinc-300 dark:text-zinc-700 font-bold opacity-20 select-none">
              {name[0]?.toUpperCase()}
            </span>
          </div>
        )
      ) : (
        <div
          role={logoUrl ? "img" : undefined}
          aria-label={logoUrl ? `${alt} unavailable` : undefined}
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
