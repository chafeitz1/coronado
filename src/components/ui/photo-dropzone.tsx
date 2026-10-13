"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { compressImageFile } from "@/lib/image-compress";

// MaintainX-style "Add or drag pictures" zone on the creation forms —
// drag-and-drop or click, with an inline preview once a file is picked.
export function PhotoDropzone({ name, label }: { name: string; label: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // This form submits the file sitting in the input itself, so the
  // compressed copy has to be written back there too (a plain <input
  // type="file"> doesn't read from React state) — not just used for the
  // preview. Covers both the click-to-pick path (whose own FileList would
  // otherwise hold the uncompressed original) and the drop path.
  async function setFile(file: File | undefined) {
    if (!file) return;
    const compressed = await compressImageFile(file);
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      inputRef.current.files = transfer.files;
    }
    setPreview(URL.createObjectURL(compressed));
  }

  function clear() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0])}
      />
      {preview ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-hairline">
          <Image src={preview} alt="" fill unoptimized className="object-cover" />
          <button
            type="button"
            onClick={clear}
            aria-label="Quitar foto"
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75 active:bg-black/75"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            setFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm font-medium transition-colors ${
            dragOver
              ? "border-primary bg-primary-soft text-primary"
              : "border-primary/30 bg-primary-soft/40 text-primary hover:bg-primary-soft/60 active:bg-primary-soft/60"
          }`}
        >
          <Camera className="size-5" />
          {label}
        </button>
      )}
    </div>
  );
}
