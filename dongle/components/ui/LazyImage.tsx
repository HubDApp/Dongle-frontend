"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { AlertCircle, Image as ImageIcon } from "lucide-react";

export interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onLoad" | "onError"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean; // Skip lazy loading for above-the-fold images
  useNextImage?: boolean; // When true, uses next/image; when false, uses <img>
  placeholderClassName?: string;
  wrapperClassName?: string;
  renderPlaceholder?: () => React.ReactNode;
  renderError?: () => React.ReactNode;
  fallbackSrc?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: (error?: unknown) => void;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  useNextImage = false,
  className = "",
  placeholderClassName = "",
  wrapperClassName = "",
  renderPlaceholder,
  renderError,
  fallbackSrc,
  rootMargin = "200px",
  threshold = 0,
  onLoad,
  onError,
  ...rest
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  React.useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  const shouldLoad = priority || isIntersecting;

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(
    (e?: unknown) => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      } else {
        setHasError(true);
      }
      onError?.(e);
    },
    [fallbackSrc, currentSrc, onError]
  );

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${fill ? "w-full h-full" : "inline-block"} ${wrapperClassName}`}
    >
      {/* Placeholder shown while loading */}
      {shouldLoad && !isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 animate-pulse transition-opacity duration-300 ${placeholderClassName}`}
        >
          {renderPlaceholder ? (
            renderPlaceholder()
          ) : (
            <ImageIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-600 animate-pulse" />
          )}
        </div>
      )}

      {/* Pre-intersection placeholder */}
      {!shouldLoad && !hasError && (
        <div
          aria-hidden="true"
          className={`w-full h-full min-h-[4rem] bg-zinc-100 dark:bg-zinc-800/60 rounded flex items-center justify-center ${placeholderClassName}`}
        >
          {renderPlaceholder ? (
            renderPlaceholder()
          ) : (
            <ImageIcon className="w-5 h-5 text-zinc-300 dark:text-zinc-700 opacity-40" />
          )}
        </div>
      )}

      {/* Error state for broken images */}
      {hasError ? (
        renderError ? (
          renderError()
        ) : (
          <div
            role="img"
            aria-label={`${alt} failed to load`}
            className="flex flex-col items-center justify-center p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-lg text-xs min-h-[3rem]"
          >
            <AlertCircle className="w-4 h-4 mb-1 text-zinc-400" />
            <span>Image unavailable</span>
          </div>
        )
      ) : shouldLoad ? (
        useNextImage ? (
          <Image
            src={currentSrc}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            fill={fill}
            sizes={sizes}
            priority={priority}
            className={`transition-opacity duration-500 ease-in-out ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${className}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        ) : (
          <img
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            className={`transition-opacity duration-500 ease-in-out ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${className}`}
            onLoad={handleLoad}
            onError={handleError}
            {...rest}
          />
        )
      ) : null}
    </div>
  );
}

export default LazyImage;
