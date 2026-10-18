"use client";

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { BACKEND_HOST } from '@/config/api';

const FALLBACK_CONCERT_IMAGE = '/images/events/et00444235-xycckhvdak-portrait.webp';

export function getFullImageUrl(path: string | undefined | null): string {
  if (!path || path === 'null' || path === 'undefined') return FALLBACK_CONCERT_IMAGE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/banner/') || path.startsWith('/images/')) return path;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_HOST}${cleanPath}`;
}

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

export default function SafeImage({
  src,
  fallbackSrc = FALLBACK_CONCERT_IMAGE,
  alt,
  className = '',
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(getFullImageUrl(src) || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  // Update when src changes
  React.useEffect(() => {
    setImgSrc(getFullImageUrl(src) || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={hasError ? fallbackSrc : imgSrc}
      alt={alt || 'Event image'}
      className={className}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}
