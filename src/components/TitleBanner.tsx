import { useState } from "react";

interface TitleBannerProps {
  className?: string;
}

/**
 * Prefers a user-supplied banner image at /title-banner.png (the painted
 * pixel-art animals + logo illustration); falls back to clean text if that
 * file hasn't been added yet — same pattern as Icon.tsx and the sound clips.
 */
export function TitleBanner({ className = "" }: TitleBannerProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <h1 className={`text-3xl font-extrabold tracking-wide text-white/95 drop-shadow-sm sm:text-4xl ${className}`}>
        ZOO_ODA VELAYATTAM
      </h1>
    );
  }

  return (
    <img
      src="/title-banner.png"
      alt="ZOO_ODA VELAYATTAM"
      draggable={false}
      className={`mx-auto h-auto w-full max-w-3xl drop-shadow-sm ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
