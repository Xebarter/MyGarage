import Image from "next/image";

function needsUnoptimized(src: string): boolean {
  const s = src.trim().toLowerCase();
  return s.startsWith("blob:") || s.startsWith("data:");
}

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Parent must be `relative` with defined size */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

export function ProductImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
}: ProductImageProps) {
  const safe = src?.trim() || "/products/default.jpg";
  const unoptimized = needsUnoptimized(safe);

  if (fill) {
    return (
      <Image
        src={safe}
        alt={alt}
        fill
        className={className}
        sizes={sizes ?? "100vw"}
        priority={priority}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={safe}
      alt={alt}
      width={width ?? 640}
      height={height ?? 640}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
