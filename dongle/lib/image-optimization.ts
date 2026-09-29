/**
 * Image Optimization Utilities
 * Provides helpers for converting img tags to Next.js Image components
 * and configuring image optimization settings
 */

export interface ImageOptimizationConfig {
  sizes?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
}

/**
 * Get responsive sizes string for different breakpoints
 */
export function getResponsiveSizes(
  maxWidth: string = '100vw',
  options?: { mobile?: string; tablet?: string; desktop?: string }
): string {
  const { mobile = '100vw', tablet = '66vw', desktop = '50vw' } = options || {};
  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`;
}

/**
 * Image aspect ratio presets
 */
export const ASPECT_RATIOS = {
  SQUARE: '1/1',
  PORTRAIT: '3/4',
  LANDSCAPE: '16/9',
  WIDE: '21/9',
  CARD: '4/3',
  HERO: '16/9',
  THUMBNAIL: '1/1',
} as const;

/**
 * Image placeholder color for different themes
 */
export function getPlaceholderColor(isDark: boolean = false): string {
  return isDark ? 'bg-zinc-800' : 'bg-zinc-100';
}

/**
 * Generate Image component props for optimization
 */
export function getImageProps(
  src: string,
  alt: string,
  config: ImageOptimizationConfig = {}
) {
  return {
    src,
    alt,
    sizes: config.sizes || getResponsiveSizes(),
    priority: config.priority || false,
    quality: config.quality || 75,
    placeholder: config.placeholder || 'empty',
  };
}

/**
 * Check if a URL is an external image that should use an Image component
 */
export function isOptimizableImage(src: string): boolean {
  if (!src) return false;
  
  // Check for IPFS URLs
  if (src.includes('ipfs://') || src.includes('gateway')) return true;
  
  // Check for HTTP(S) URLs
  if (src.startsWith('http://') || src.startsWith('https://')) return true;
  
  // Check for relative paths (local images)
  if (src.startsWith('/images/') || src.startsWith('./') || src.startsWith('../')) return true;
  
  return false;
}

/**
 * Extract image URLs from HTML string for auditing
 * Returns array of img tags found in the content
 */
export function extractImgTags(htmlContent: string): Array<{
  tag: string;
  src: string;
  alt: string;
  className?: string;
}> {
  const imgRegex = /<img\s+[^>]*>/gi;
  const srcRegex = /src=["']([^"']+)["']/i;
  const altRegex = /alt=["']([^"']+)["']/i;
  const classRegex = /class=["']([^"']+)["']/i;

  const matches = htmlContent.match(imgRegex) || [];
  
  return matches.map(tag => ({
    tag,
    src: (srcRegex.exec(tag)?.[1] || ''),
    alt: (altRegex.exec(tag)?.[1] || ''),
    className: classRegex.exec(tag)?.[1],
  }));
}

/**
 * Convert an img tag to Next.js Image component JSX
 */
export function imgTagToImageComponent(
  imgData: {
    src: string;
    alt: string;
    className?: string;
  },
  options: ImageOptimizationConfig = {}
): string {
  const props = getImageProps(imgData.src, imgData.alt, options);
  const classNameStr = imgData.className ? ` className="${imgData.className}"` : '';
  
  return `<Image
  src="${props.src}"
  alt="${props.alt}"
  sizes="${props.sizes}"
  quality={${props.quality}}
  priority={${props.priority}}${classNameStr}
/>`;
}

/**
 * Image optimization checklist
 */
export const IMAGE_OPTIMIZATION_CHECKLIST = [
  'Replace all <img> tags with Next.js <Image> component',
  'Add width and height attributes to images',
  'Set appropriate sizes prop for responsive images',
  'Use priority={true} for above-the-fold images',
  'Set quality value (75 is good default, 100 for critical images)',
  'Use placeholder for better perceived performance',
  'Optimize image dimensions before upload',
  'Use WebP format for modern browsers',
  'Add alt text for accessibility',
  'Test on mobile devices for performance',
];

/**
 * Get common configuration presets
 */
export const IMAGE_PRESETS = {
  HERO: {
    sizes: '100vw',
    priority: true,
    quality: 85,
    placeholder: 'blur' as const,
  },
  CARD: {
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    priority: false,
    quality: 75,
    placeholder: 'empty' as const,
  },
  THUMBNAIL: {
    sizes: '(max-width: 640px) 100vw, 150px',
    priority: false,
    quality: 60,
    placeholder: 'empty' as const,
  },
  AVATAR: {
    sizes: '(max-width: 640px) 40px, 60px',
    priority: false,
    quality: 75,
    placeholder: 'empty' as const,
  },
} as const;
