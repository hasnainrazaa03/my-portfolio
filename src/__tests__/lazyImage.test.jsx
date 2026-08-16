/**
 * lazyImage.test.jsx — state-driven image fallback (Phase 3 / T3.4, fixes F-25).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LazyImage from '../components/ui/LazyImage.tsx';
import { toWebpSrc } from '../utils/images';

describe('toWebpSrc', () => {
  it('derives the sibling .webp for local raster paths', () => {
    expect(toWebpSrc('/DRDO1.png')).toBe('/DRDO1.webp');
    expect(toWebpSrc('/me.jpg')).toBe('/me.webp');
    expect(toWebpSrc('/photo.JPEG')).toBe('/photo.webp');
  });

  it('returns null for remote URLs — we cannot guarantee a sibling exists', () => {
    // A <source> that 404s does NOT fall back to the <img>; it renders broken.
    expect(toWebpSrc('https://cdn.jsdelivr.net/icon.png')).toBeNull();
    expect(toWebpSrc('//example.com/x.png')).toBeNull();
  });

  it('returns null for non-raster and query-bearing paths', () => {
    expect(toWebpSrc('/me.svg')).toBeNull();
    expect(toWebpSrc('/resume.pdf')).toBeNull();
    expect(toWebpSrc('/x.png?v=2')).toBeNull();
  });
});

describe('LazyImage', () => {
  it('offers a webp source for local images', () => {
    const { container } = render(<LazyImage src="/DRDO1.png" alt="cfd" />);
    const source = container.querySelector('source');
    expect(source).toHaveAttribute('srcset', '/DRDO1.webp');
    expect(source).toHaveAttribute('type', 'image/webp');
    // `contents` keeps the <img> laying out against the original parent.
    expect(container.querySelector('picture')).toHaveClass('contents');
  });

  it('renders a bare <img> for remote sources (no <picture> wrapper)', () => {
    const { container } = render(<LazyImage src="https://cdn.example/x.png" alt="icon" />);
    expect(container.querySelector('picture')).toBeNull();
    expect(screen.getByAltText('icon')).toBeInTheDocument();
  });

  it('renders an <img> with lazy loading and the given alt', () => {
    render(<LazyImage src="/x.png" alt="logo" />);
    const img = screen.getByAltText('logo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('passes through width/height/className', () => {
    render(<LazyImage src="/x.png" alt="logo" width={20} height={20} className="object-contain" />);
    const img = screen.getByAltText('logo');
    expect(img).toHaveAttribute('width', '20');
    expect(img).toHaveClass('object-contain');
  });

  it('renders the fallback when src is missing', () => {
    render(<LazyImage src={null} alt="logo" fallback={<span>FB</span>} />);
    expect(screen.getByText('FB')).toBeInTheDocument();
    expect(screen.queryByAltText('logo')).not.toBeInTheDocument();
  });

  it('swaps to the fallback on error (state-driven, not DOM mutation)', () => {
    render(<LazyImage src="/broken.png" alt="logo" fallback={<span>FB</span>} />);
    const img = screen.getByAltText('logo');
    fireEvent.error(img);
    expect(screen.queryByAltText('logo')).not.toBeInTheDocument();
    expect(screen.getByText('FB')).toBeInTheDocument();
  });

  it('invokes the onError callback so a parent can react', () => {
    const onError = vi.fn();
    render(<LazyImage src="/broken.png" alt="logo" onError={onError} />);
    fireEvent.error(screen.getByAltText('logo'));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
