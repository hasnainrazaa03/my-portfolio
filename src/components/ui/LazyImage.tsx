import { useState } from 'react';
import type { ImgHTMLAttributes, ReactNode, SyntheticEvent } from 'react';
import { toWebpSrc } from '../../utils/images';

/**
 * LazyImage — a lazy-loaded <img> with a state-driven error fallback and
 * automatic WebP delivery.
 *
 * Replaces four ad-hoc `onError={(e) => e.target.style.display = 'none'}`
 * usages (ProjectCard, SkillBar, Education, TimelineItem). Crucially this is
 * STATE-driven, not direct DOM mutation (fixes F-25): on error (or when `src`
 * is missing) it renders `fallback` instead of the image.
 *
 * WEBP: every raster image under public/ has a sibling .webp (see the asset
 * pipeline note in README). When `src` is a local .png/.jpg/.jpeg we wrap the
 * <img> in a <picture> and offer that sibling first — roughly an 80% byte
 * saving across the site.
 *
 * The derivation is only safe because the sibling is guaranteed to exist:
 * if a <source> is selected and then fails to load, the browser does NOT fall
 * back to the <img> src — it renders broken. So we restrict derivation to
 * local raster paths and never guess for remote/CDN URLs.
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

  const webpSrc = toWebpSrc(src);

  const img = (
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

  if (!webpSrc) return img;

  // `contents` removes the <picture> box from the layout tree, so the <img>
  // still lays out as a direct child of the original parent. Every call site
  // sizes the image with `w-full h-full` against a sized ancestor, which would
  // otherwise resolve against an inline <picture> and collapse.
  return (
    <picture className="contents">
      <source srcSet={webpSrc} type="image/webp" />
      {img}
    </picture>
  );
}
