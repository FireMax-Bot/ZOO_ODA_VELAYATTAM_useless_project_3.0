import { useEffect, useState } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

interface IconProps {
  name: PixelIconName;
  size?: number;
  className?: string;
}

/**
 * Prefers a user-supplied image at /icons/<name>.png; falls back to the
 * built-in hand-coded pixel icon if that file hasn't been added yet — same
 * graceful-degradation pattern as the animal sound clips in public/sounds.
 *
 * The mic button reuses one Icon instance for "mic"/"stop"/"hourglass" as
 * the recording phase changes. `failed` must be reset whenever `name`
 * changes, or a missing stop.png/hourglass.png would permanently poison
 * this instance and make it fall back to the pixel mic forever after —
 * even once the phase returns to "mic", which does have a working file.
 */
export function Icon({ name, size = 20, className = "" }: IconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [name]);

  if (failed) {
    return <PixelIcon name={name} size={size} className={className} />;
  }

  return (
    <img
      key={name}
      src={`/icons/${name}.png`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ objectFit: "contain", imageRendering: "pixelated" }}
      onError={() => setFailed(true)}
    />
  );
}
