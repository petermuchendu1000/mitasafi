import type { ReactNode } from "react";

const glyphs = {
  pin: <><path d="M19 10c0 4.4-7 10.4-7 10.4S5 14.4 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.4" /></>,
  home: <><path d="m3.4 11.4 8.6-7.2 8.6 7.2M5.4 10v9.2h13.2V10" /><path d="M10 19.2v-5.6h4v5.6" /></>,
  search: <><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.1 15.1 4.4 4.4" /></>,
  chevron: <path d="m7.3 9.5 4.7 4.7 4.7-4.7" />,
  bell: <><path d="M4.7 17.1h14.6l-1.9-2.4v-4a5.4 5.4 0 0 0-10.8 0v4l-1.9 2.4ZM10.2 20h3.6" /><path d="M12 3.3v1.1" /></>,
  menu: <path d="M4 7.1h16M4 12h16M4 16.9h16" />,
  close: <path d="m6.3 6.3 11.4 11.4m0-11.4L6.3 17.7" />,
  heart: <path d="M12 20s-8.4-4.9-8.4-10a4.1 4.1 0 0 1 8.4-1 4.1 4.1 0 0 1 8.4 1c0 5.1-8.4 10-8.4 10Z" />,
  shield: <><path d="M12 3.6c2.2 1.5 4.6 2.3 7 2.7v5.2c0 4.2-2.3 6.8-7 9-4.7-2.2-7-4.8-7-9V6.3c2.4-.4 4.8-1.2 7-2.7Z" /><path d="m8.9 11.9 2.1 2.1 4.2-4.2" /></>,
  message: <><path d="M20.4 11.6c0 4.1-3.7 7.2-8.4 7.2a9.7 9.7 0 0 1-3.2-.5l-4 1.9 1-3.7a6.4 6.4 0 0 1-2.2-4.9C3.6 7.5 7.3 4.4 12 4.4s8.4 3.1 8.4 7.2Z" /><path d="M8.4 11.5h.1m3.5 0h.1m3.4 0h.1" strokeWidth="2.4" /></>,
  checklist: <><path d="M8 5.5H6.3v15h11.4v-15H16M8 5.5v2.1h8V5.5l-1.5-1.2h-5L8 5.5Z" /><path d="m9 12.5 1.9 1.9 4-4M9 17h6" /></>,
  brush: <><path d="m9.2 14.1 7.9-9.5a1.3 1.3 0 0 1 2 1.6l-7.4 10M4.1 17.5l3.8-4.6 4.7 3.1-1.9 4.3Z" /><path d="m6.4 19 2.8-3.9" /></>,
  plumbing: <><path d="M5 12h3V7.8h7.4a3.8 3.8 0 0 1 3.8 3.8v2.2h-4.5v-2H12V16H5m3-8.2V5m-2.8 0h5.6M5 10.3v7.4" /><path d="M17 16c-.9 1.3-1.3 2.1-1.3 2.7a1.3 1.3 0 0 0 2.6 0c0-.6-.4-1.4-1.3-2.7Z" /></>,
  bolt: <path d="m13.5 3.6-8 10h6l-1 6.8 8-10h-6.1l1.1-6.8Z" />,
  truck: <><path d="M5.6 16.5H3.4V6.1h11.8v10.4H9m6.2-6.9h3.4l2.1 3.5v3.4h-1.3m-3.4 0h-.8" /><circle cx="7.3" cy="17.3" r="1.7" /><circle cx="17.7" cy="17.3" r="1.7" /></>,
  arrow: <path d="M4.5 12h14.8m-6-6 6 6-6 6" />,
  key: <><circle cx="8.1" cy="9.2" r="4.1" /><path d="m11 12.1 6.9 6.9 1.8-1.8m-5.6-2.1 1.9-1.9" /></>,
  tools: <><path d="M14.2 5a4 4 0 0 0-4.9 5.6l-4.7 4.7a2.1 2.1 0 0 0 3 3l4.7-4.7A4 4 0 0 0 18 8.7l-2.6 2.6-2.8-2.8L15.3 6" /><path d="m16.1 15.3 3.5 3.5" /></>,
  pause: <path d="M9 6v12m6-12v12" />,
  resume: <path d="m8.5 5.7 9 6.3-9 6.3Z" />,
  plus: <path d="M12 6v12M6 12h12" />,
  mail: <><rect x="3.7" y="6.1" width="16.6" height="11.8" rx="2" /><path d="m5 7.7 7 5.1 7-5.1" /></>,
} satisfies Record<string, ReactNode>;

export type HomeIconName = keyof typeof glyphs;

export function HomeIcon({ name, size = 24, className }: { name: HomeIconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyphs[name]}
    </svg>
  );
}
