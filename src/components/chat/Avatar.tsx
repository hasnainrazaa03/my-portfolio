import React, { useState } from 'react';
import type { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  fallback: ReactNode;
  className?: string;
}

/** Small circular avatar — falls back to initials when image missing. */
const Avatar = ({ src, fallback, className = '' }: AvatarProps) => {
  const [imgError, setImgError] = useState(false);
  if (imgError || !src) {
    return (
      <div className={`flex items-center justify-center font-bold text-xs select-none ${className}`}>
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Avatar"
      onError={() => setImgError(true)}
      className={`object-cover ${className}`}
    />
  );
};

export default Avatar;
