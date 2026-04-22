"use client";

import { useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  header: string;
  accessor: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

type SortDir = "asc" | "desc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado.",
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(accessor: string) {
    if (sortKey === accessor) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(accessor);
      setSortDir("asc");
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "pt-BR");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg glass-card",
        className
      )}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-white/[0.02]">
            {columns.map((col) => (
              <th
                key={col.accessor}
                aria-sort={
                  col.sortable
                    ? sortKey === col.accessor
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                    : undefined
                }
                className={cn(
                  "px-5 py-3.5 text-[11px] font-semibold text-[#6B6F76] uppercase tracking-wider",
                  col.sortable &&
                    "cursor-pointer select-none hover:text-[#8B8F96]",
                  col.className
                )}
                onClick={
                  col.sortable ? () => handleSort(col.accessor) : undefined
                }
                onKeyDown={
                  col.sortable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(col.accessor);
                        }
                      }
                    : undefined
                }
                tabIndex={col.sortable ? 0 : undefined}
                role={col.sortable ? "button" : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.accessor && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        "transition-transform",
                        sortDir === "desc" && "rotate-180"
                      )}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-16 text-center text-sm text-[#6B6F76]"
              >
                <img
                  src="/illustrations/empty-state.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-24 w-24 mx-auto mb-4 opacity-60"
                />
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={cn(
                  "transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#94C020]/40 focus-visible:ring-inset",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.accessor}
                    className={cn(
                      "px-5 py-3.5 text-[13px] text-[#ACACB0]",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row[col.accessor], row)
                      : (row[col.accessor] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
