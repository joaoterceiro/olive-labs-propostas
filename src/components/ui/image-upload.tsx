"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "./icon";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  compact?: boolean;
  accept?: string;
}

export function ImageUpload({
  value,
  onChange,
  label,
  compact = false,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem deve ter no maximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "attachments");
      formData.append("prefix", "proposal-images");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error || "Erro ao enviar imagem");
        return;
      }

      // Use local blob URL for immediate preview
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
    } catch {
      alert("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    onChange(null);
  }

  const height = compact ? "h-20" : "h-32";

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[#6B6F76]">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {value ? (
        <div className={`relative ${height} overflow-hidden rounded-lg border border-white/[0.06] bg-[#151517]`}>
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F87171] text-white transition-colors hover:bg-[#EF4444]"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex ${height} cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-[#94C020] bg-[#94C020]/5"
              : "border-white/[0.1] bg-white/[0.02] hover:border-[#94C020]/40 hover:bg-white/[0.04]"
          }`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B6F76]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#94C020] border-t-transparent" />
              Enviando...
            </div>
          ) : (
            <>
              <Icon name="image" size={compact ? 18 : 24} className="text-[#6B6F76]" />
              <span className="text-xs text-[#6B6F76]">
                {compact ? "Adicionar imagem" : "Clique ou arraste uma imagem"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
