"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadListingImage } from "@/lib/upload-listing-image";

export type ListingImageMode = "product" | "service";

type ListingImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  mode?: ListingImageMode;
};

const PRODUCT_DEFAULT = "/products/default.jpg";

export function ListingImageField({ value, onChange, disabled, mode = "product" }: ListingImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [justUploaded, setJustUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyValue = mode === "product" ? PRODUCT_DEFAULT : "";
  const hasCustomImage =
    mode === "product"
      ? Boolean(value && value !== PRODUCT_DEFAULT)
      : Boolean(value && value.trim().length > 0);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setError(null);
      setJustUploaded(false);
      if (!file.type.startsWith("image/")) {
        setError("Choose an image file.");
        return;
      }
      setUploading(true);
      setProgress(0);
      const ac = new AbortController();
      try {
        const url = await uploadListingImage(file, {
          signal: ac.signal,
          onProgress: (p) => setProgress(p.percent),
        });
        onChange(url);
        setJustUploaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange],
  );

  useEffect(() => {
    if (!justUploaded) return;
    const t = window.setTimeout(() => setJustUploaded(false), 1200);
    return () => window.clearTimeout(t);
  }, [justUploaded]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            void onFile(f ?? null);
          }}
          className={cn(
            "flex min-h-[152px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/25 px-4 py-5 text-center transition",
            "hover:border-primary/45 hover:bg-muted/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            (disabled || uploading) && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              void onFile(f ?? null);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-9 w-9 animate-spin text-emerald-600" aria-hidden />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Uploading… {Math.min(100, Math.max(0, progress))}%
              </p>
            </div>
          ) : justUploaded ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Uploaded</p>
            </div>
          ) : hasCustomImage ? (
            <div className="relative mx-auto max-h-36 w-full max-w-[220px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote + blob URLs */}
              <img
                src={value}
                alt=""
                className="max-h-36 w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">Drop an image here or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, GIF · up to 5&nbsp;MB</p>
            </>
          )}
        </button>

        {hasCustomImage ? (
          <div className="flex flex-col gap-2 lg:w-36">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={disabled || uploading}
              onClick={() => {
                onChange(emptyValue);
                setError(null);
              }}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              Replace
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
