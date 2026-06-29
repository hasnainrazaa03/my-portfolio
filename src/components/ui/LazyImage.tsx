import { useState } from 'react';
import type { ImgHTMLAttributes, ReactNode, SyntheticEvent } from 'react';

/**
 * LazyImage — a lazy-loaded <img> with a state-driven error fallback.
 *
 * Replaces four ad-hoc `onError={(e) => e.target.style.display = 'none'}`
 * usages (ProjectCard, SkillBar, Education, TimelineItem). Crucially this is
 * STATE-driven, not direct DOM mutation (fixes F-25): on error (or when `src`
 * is missing) it renders `fallback` instead of the image.
 *
 * Defaults `loading="lazy"` + `decoding="async"`. Pass explicit width/height to
 * curb layout shift. The optional `onError` prop lets a parent react (e.g. hide
 * a wrapper) without touching the DOM.
 */
export interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
}

export default function LazyImage({
  src,
  alt,
  fallback = null,
  onError,
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: LazyImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
