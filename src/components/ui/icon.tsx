"use client";

import { cn } from "@/lib/utils";

const paths: Record<string, React.ReactNode> = {
  arrow: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </>
  ),
  check: <polyline points="20,6 9,17 4,12" />,
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  tag: (
    <>
      <path d="M20.59,13.41l-7.17,7.17a2,2,0,0,1-2.83,0L2,12V2H12l8.59,8.59A2,2,0,0,1,20.59,13.41Z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  eye: (
    <>
      <path d="M1,12S5,5,12,5s11,7,11,7-4,7-11,7S1,12,1,12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  quote: (
    <>
      <path d="M3,21c3,0,7-1,7-8V5c0-1.25-.756-2.017-2-2H4c-1.25,0-2,.75-2,1.972V11c0,1.25.75,2,2,2 1.25,0,2,.75,2,2v1c0,1.25-.75,2-2,2H3" />
      <path d="M15,21c3,0,7-1,7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25,0-2,.75-2,1.972V11c0,1.25.75,2,2,2h1c1.25,0,2,.75,2,2v1c0,1.25-.75,2-2,2h-1" />
    </>
  ),
  zap: <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />,
  star: (
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
  ),
  pdf: (
    <>
      <path d="M14,2H6A2,2,0,0,0,4,4V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V8Z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  layers: (
    <>
      <polygon points="12,2 2,7 12,12 22,7 12,2" />
      <polyline points="2,17 12,22 22,17" />
      <polyline points="2,12 12,17 22,12" />
    </>
  ),
  type: (
    <>
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>
  ),
  move: (
    <>
      <polyline points="5,9 2,12 5,15" />
      <polyline points="9,5 12,2 15,5" />
      <polyline points="15,19 12,22 9,19" />
      <polyline points="19,9 22,12 19,15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </>
  ),
  users: (
    <>
      <path d="M17,21v-2a4,4,0,0,0-4-4H5a4,4,0,0,0-4,4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23,21v-2a4,4,0,0,0-3-3.87" />
      <path d="M16,3.13a4,4,0,0,1,0,7.75" />
    </>
  ),
  bell: (
    <>
      <path d="M18,8A6,6,0,0,0,6,8c0,7-3,9-3,9H21s-3-2-3-9" />
      <path d="M13.73,21a2,2,0,0,1-3.46,0" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  success: (
    <>
      <path d="M22,11.08V12a10,10,0,1,1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.29,3.86L1.82,18a2,2,0,0,0,1.71,3H20.47a2,2,0,0,0,1.71-3L13.71,3.86A2,2,0,0,0,10.29,3.86Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  trash: (
    <>
      <polyline points="3,6 5,6 21,6" />
      <path d="M19,6l-1,14H6L5,6" />
      <path d="M10,11v6M14,11v6M9,6V4h6v2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5,15H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2H13a2,2,0,0,1,2,2V5" />
    </>
  ),
  upload: (
    <>
      <polyline points="16,16 12,12 8,16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39,18.39A5,5,0,0,0,18,9h-1.26A8,8,0,1,0,3,16.3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  filter: <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />,
  table: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </>
  ),
  nav: (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  avatar: (
    <>
      <path d="M20,21v-2a4,4,0,0,0-4-4H8a4,4,0,0,0-4,4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  kbd: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6,9h.01M10,9h.01M14,9h.01M18,9h.01M8,13h.01M12,13h.01M16,13h.01" />
    </>
  ),
  tooltip: (
    <path d="M21,15a2,2,0,0,1-2,2H7l-4,4V5a2,2,0,0,1,2-2H19a2,2,0,0,1,2,2Z" />
  ),
  modal: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </>
  ),
  loader: (
    <>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </>
  ),
  empty: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  list: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  stepwiz: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4,15a1.65,1.65,0,0,0,.33,1.82l.06.06a2,2,0,0,1-2.83,2.83l-.06-.06a1.65,1.65,0,0,0-1.82-.33,1.65,1.65,0,0,0-1,1.51V21a2,2,0,0,1-4,0v-.09A1.65,1.65,0,0,0,9,19.4a1.65,1.65,0,0,0-1.82.33l-.06.06a2,2,0,0,1-2.83-2.83l.06-.06A1.65,1.65,0,0,0,4.68,15a1.65,1.65,0,0,0-1.51-1H3a2,2,0,0,1,0-4h.09A1.65,1.65,0,0,0,4.6,9a1.65,1.65,0,0,0-.33-1.82l-.06-.06A2,2,0,0,1,7.04,4.29l.06.06A1.65,1.65,0,0,0,9,4.68a1.65,1.65,0,0,0,1-1.51V3a2,2,0,0,1,4,0v.09a1.65,1.65,0,0,0,1,1.51,1.65,1.65,0,0,0,1.82-.33l.06-.06a2,2,0,0,1,2.83,2.83l-.06.06A1.65,1.65,0,0,0,19.32,9a1.65,1.65,0,0,0,1.51,1H21a2,2,0,0,1,0,4h-.09A1.65,1.65,0,0,0,19.4,15Z" />
    </>
  ),
  home: (
    <>
      <path d="M3,9l9-7,9,7v11a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2Z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </>
  ),
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </>
  ),
  chevron: <polyline points="6,9 12,15 18,9" />,
  "chevron-left": <polyline points="15,18 9,12 15,6" />,
  "chevron-right": <polyline points="9,18 15,12 9,6" />,
  menu: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </>
  ),
  "panel-left": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  "horizontal-rule": <line x1="4" y1="12" x2="20" y2="12" />,
  blockquote: (
    <>
      <line x1="6" y1="5" x2="6" y2="19" strokeWidth="3" />
      <line x1="10" y1="8" x2="20" y2="8" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="16" x2="16" y2="16" />
    </>
  ),
};

export type IconName = keyof typeof paths;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  className,
}: IconProps) {
  const content = paths[name];
  if (!content) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
