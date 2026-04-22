"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "./icon";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  compact?: boolean;
  accept?: string;
  /** Maximum file size in MB (default 10) */
  maxSizeMB?: number;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"];

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function ImageUpload({
  value,
  onChange,
  label,
  compact = false,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (!hasAcceptedExtension(file.name) && !file.type.startsWith("image/")) {
      toast("Arquivo nao suportado. Envie PNG, JPG, WEBP, GIF ou SVG.", "error");
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast(`Imagem excede ${maxSizeMB}MB. Reduza o tamanho e tente novamente.`, "error");
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
        const message =
          (err as { error?: string }).error || "Erro ao enviar imagem";
        console.error("[image-upload] upload failed:", res.status, message);
        toast(message, "error");
        return;
      }

      // Use local blob URL for immediate preview until the user navigates away
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
      toast("Imagem enviada", "success");
    } catch (err) {
      console.error("[image-upload] network error:", err);
      toast("Erro de rede ao enviar imagem. Verifique sua conexao.", "error");
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
        <div
          className={`relative ${height} overflow-hidden rounded-lg border border-white/[0.06] bg-[#151517]`}
        >
          <img
            src={value}
            alt="Preview"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F87171] text-white transition-colors hover:bg-[#EF4444]"
            aria-label="Remover imagem"
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex ${height} cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-[#94C020] bg-[#94C020]/10 text-[#94C020]"
              : "border-white/[0.1] bg-white/[0.02] hover:border-[#94C020]/40 hover:bg-white/[0.04]"
          }`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B6F76]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#94C020] border-t-transparent" />
              Enviando...
            </div>
          ) : dragOver ? (
            <>
              <Icon name="upload" size={compact ? 18 : 24} />
              <span className="text-xs font-medium">Solte a imagem aqui</span>
            </>
          ) : (
            <>
              <Icon
                name="image"
                size={compact ? 18 : 24}
                className="text-[#6B6F76]"
              />
              <span className="text-xs text-[#6B6F76]">
                {compact ? "Adicionar imagem" : "Clique ou arraste uma imagem"}
              </span>
              <span className="text-[10px] text-[#4A4B50]">
                PNG, JPG, WEBP, GIF, SVG — max {maxSizeMB}MB
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
