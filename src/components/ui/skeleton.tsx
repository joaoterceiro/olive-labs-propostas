import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div className={cn("skel h-4 w-full rounded-md", className)} />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("skel h-32 w-full rounded-lg", className)} />
  );
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return (
    <div className={cn("skel h-10 w-10 rounded-full", className)} />
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-white/[0.06]", className)}>
      {/* Header */}
      <div className="flex gap-4 bg-white/[0.02] px-4 py-3">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skel h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 border-t border-white/[0.06] px-4 py-3"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skel h-3 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic skeleton block for custom use */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skel rounded-md", className)} />;
}
