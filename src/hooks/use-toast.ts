"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = () => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function addToast(message: string, variant: ToastVariant = "info") {
  const id = Math.random().toString(36).substring(2, 9);
  toasts = [...toasts, { id, message, variant }];
  emit();

  setTimeout(() => {
    removeToast(id);
  }, 3000);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      addToast(message, variant);
    },
    []
  );

  return { toasts: items, toast, removeToast };
}
