/**
 * lazyImage.test.jsx — state-driven image fallback (Phase 3 / T3.4, fixes F-25).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LazyImage from '../components/ui/LazyImage.tsx';

describe('LazyImage', () => {
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
