"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

type Listener = () => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

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

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

function addToast(
  message: string,
  variant: ToastVariant = "info",
  durationMs?: number
) {
  const id = Math.random().toString(36).substring(2, 9);
  const duration = durationMs ?? DEFAULT_DURATIONS[variant];
  toasts = [...toasts, { id, message, variant, durationMs: duration }];
  emit();

  const timer = setTimeout(() => removeToast(id), duration);
  timers.set(id, timer);
}

function removeToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info", durationMs?: number) => {
      addToast(message, variant, durationMs);
    },
    []
  );

  return { toasts: items, toast, removeToast };
}
