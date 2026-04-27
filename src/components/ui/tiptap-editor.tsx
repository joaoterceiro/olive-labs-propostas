"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/* ------------------------------------------------------------------ */
/*  Tiny inline SVG icons for the toolbar                              */
/* ------------------------------------------------------------------ */

function SvgIcon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
      <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
      <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M17.3 4.9c-.4-.8-1.1-1.5-2-1.9C14.4 2.6 13.3 2.5 12 2.5c-1.3 0-2.5.3-3.5 1-1 .6-1.5 1.6-1.5 2.8 0 .5.1 1 .4 1.4.2.5.6.9 1 1.2.5.4 1 .7 1.6.9" />
      <path d="M8 16.1c0 .5.1 1 .4 1.5.2.5.6.9 1.1 1.2.5.4 1 .6 1.6.8.6.2 1.2.3 1.9.3 1.3 0 2.5-.3 3.5-1 1-.6 1.5-1.6 1.5-2.8 0-.4-.1-.8-.2-1.1" />
    </svg>
  );
}

function BlockquoteIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="5" x2="6" y2="19" strokeWidth="3" />
      <line x1="10" y1="8" x2="20" y2="8" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function HorizontalRuleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                     */
/* ------------------------------------------------------------------ */

interface TBtnProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function TBtn({ active, onClick, title, children }: TBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-xs font-semibold transition-colors",
        active
          ? "bg-[#94C020]/20 text-[#94C020]"
          : "text-[#8B8F96] hover:text-[#E2E3E4] hover:bg-white/[0.06]"
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Link popover                                                       */
/* ------------------------------------------------------------------ */

interface LinkPopoverProps {
  initialUrl: string;
  hasLink: boolean;
  onApply: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

function LinkPopover({ initialUrl, hasLink, onApply, onRemove, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onApply(url.trim());
    }
  };

  return (
    <div className="glass-strong rounded-lg p-3 shadow-lg absolute left-0 top-full mt-1 z-50 animate-slide-in">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="h-7 w-56 rounded-md bg-white/[0.06] border border-white/[0.08] px-2 text-xs text-[#E2E3E4] placeholder-[#6B6F76] focus:outline-none focus:border-[#94C020]/40 focus:ring-1 focus:ring-[#94C020]/20"
        />
        <button
          type="submit"
          className="h-7 rounded-md bg-[#94C020]/20 px-2.5 text-xs font-medium text-[#94C020] hover:bg-[#94C020]/30 transition-colors"
        >
          Aplicar
        </button>
        {hasLink && (
          <button
            type="button"
            onClick={onRemove}
            className="h-7 rounded-md bg-[#F87171]/10 px-2.5 text-xs font-medium text-[#F87171] hover:bg-[#F87171]/20 transition-colors"
          >
            Remover
          </button>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const [editorFocused, setEditorFocused] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkBtnRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useCallback(
    ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
      if (editor) {
        onChange(editor.getHTML());
      }
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[#94C020] underline" } }),
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder: placeholder || "Comece a escrever...",
      }),
    ],
    content,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-invert max-w-none min-h-[80px] px-4 py-3 focus:outline-none text-[#ACACB0] " +
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-[#E2E3E4] " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-[#E2E3E4] " +
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 " +
          "[&_a]:text-[#94C020] [&_a]:underline " +
          "[&_blockquote]:border-l-2 [&_blockquote]:border-[#94C020]/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#8B8F96] " +
          "[&_hr]:border-white/[0.08] [&_hr]:my-3 " +
          "[&_p]:my-1",
      },
    },
  });

  // Track editor focus state
  useEffect(() => {
    if (!editor) return;

    const onFocus = () => setEditorFocused(true);
    const onBlur = () => setEditorFocused(false);

    editor.on("focus", onFocus);
    editor.on("blur", onBlur);

    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(previousUrl ?? "https://");
    setLinkPopoverOpen((prev) => !prev);
  }, [editor]);

  const applyLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      setLinkPopoverOpen(false);
    },
    [editor]
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkPopoverOpen(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.04] focus-within:ring-2 focus-within:ring-[#94C020]/30">
      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 border-b border-white/[0.04] bg-white/[0.02] px-2 py-1 transition-opacity",
          !editorFocused && "opacity-40"
        )}
      >
        {/* Text formatting: B, I, U, S */}
        <div className="flex items-center gap-0.5 rounded-md px-1 py-0.5 bg-white/[0.03]">
          <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
            B
          </TBtn>
          <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italico">
            <span className="italic">I</span>
          </TBtn>
          <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
            <span className="underline">U</span>
          </TBtn>
          <TBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Riscado">
            <StrikethroughIcon />
          </TBtn>
        </div>

        {/* Headings: H2, H3 */}
        <div className="flex items-center gap-0.5 rounded-md px-1 py-0.5 bg-white/[0.03]">
          <TBtn
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Titulo 2"
          >
            H2
          </TBtn>
          <TBtn
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Titulo 3"
          >
            H3
          </TBtn>
        </div>

        {/* Lists + Blockquote */}
        <div className="flex items-center gap-0.5 rounded-md px-1 py-0.5 bg-white/[0.03]">
          <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
            <BulletListIcon />
          </TBtn>
          <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
            <OrderedListIcon />
          </TBtn>
          <TBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citacao">
            <BlockquoteIcon />
          </TBtn>
        </div>

        {/* Alignment: L, C, R */}
        <div className="flex items-center gap-0.5 rounded-md px-1 py-0.5 bg-white/[0.03]">
          <TBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinhar a esquerda">
            <AlignLeftIcon />
          </TBtn>
          <TBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centralizar">
            <AlignCenterIcon />
          </TBtn>
          <TBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinhar a direita">
            <AlignRightIcon />
          </TBtn>
        </div>

        {/* Link + HR */}
        <div className="relative flex items-center gap-0.5 rounded-md px-1 py-0.5 bg-white/[0.03]" ref={linkBtnRef}>
          <TBtn active={editor.isActive("link")} onClick={handleLinkClick} title="Link">
            <LinkIcon />
          </TBtn>
          <TBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
            <HorizontalRuleIcon />
          </TBtn>
          {linkPopoverOpen && (
            <LinkPopover
              initialUrl={linkUrl}
              hasLink={editor.isActive("link")}
              onApply={applyLink}
              onRemove={removeLink}
              onClose={() => setLinkPopoverOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
