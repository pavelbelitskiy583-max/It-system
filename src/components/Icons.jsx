import React from "react";

const base = { className: "icon", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" };

export const IcDash = (p) => (
  <svg {...base} {...p}><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z" strokeLinejoin="round" /></svg>
);
export const IcBox = (p) => (
  <svg {...base} {...p}><path d="M3 7l9-4 9 4-9 4-9-4Z" strokeLinejoin="round" /><path d="M3 7v10l9 4 9-4V7M12 11v10" strokeLinejoin="round" /></svg>
);
export const IcCartridge = (p) => (
  <svg {...base} {...p}><rect x="6" y="3" width="12" height="7" rx="0.5" /><path d="M8 10v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-9M10 6h4" strokeLinecap="round" /></svg>
);
export const IcServer = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="6" /><rect x="3" y="14" width="18" height="6" /><path d="M7 7h.01M7 17h.01" strokeLinecap="round" strokeWidth="2" /></svg>
);
export const IcTask = (p) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></svg>
);
export const IcChat = (p) => (
  <svg {...base} {...p}><path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" /></svg>
);
export const IcVault = (p) => (
  <svg {...base} {...p}><rect x="4" y="10" width="16" height="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1.4" /></svg>
);
export const IcBuilding = (p) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" /><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M10 21v-4h4v4" strokeLinecap="round" strokeWidth="2" /></svg>
);
export const IcUsers = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M22 19.5c0-2.6-1.8-4.3-4-4.9" /></svg>
);
export const IcSettings = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" /></svg>
);
export const IcArrow = (p) => (
  <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IcCheck = (p) => (
  <svg {...base} {...p}><path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IcLock = (p) => (
  <svg {...base} {...p}><rect x="5" y="11" width="14" height="9" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const IcKey = (p) => (
  <svg {...base} {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l2 2M14 9l2 2" strokeLinecap="round" /></svg>
);
export const IcCopy = (p) => (
  <svg {...base} {...p}><rect x="9" y="9" width="12" height="12" /><path d="M5 15V4a1 1 0 0 1 1-1h11" /></svg>
);
export const IcEye = (p) => (
  <svg {...base} {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IcEyeOff = (p) => (
  <svg {...base} {...p}><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.6 6.7C4 8.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.2-1M9.9 5.1C10.6 5 11.3 5 12 5c6.4 0 10 7 10 7a15 15 0 0 1-2.9 3.9" strokeLinecap="round" /></svg>
);
export const IcPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
);
export const IcTrash = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IcSend = (p) => (
  <svg {...base} {...p}><path d="M4 12l17-8-6.5 17-3-7-7.5-2Z" strokeLinejoin="round" /></svg>
);
export const IcClose = (p) => (
  <svg {...base} {...p}><path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" /></svg>
);
export const IcRefresh = (p) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 0 1 15.3-6.4M21 12a9 9 0 0 1-15.3 6.4" strokeLinecap="round" /><path d="M18 3v4h-4M6 21v-4h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const IcInbox = (p) => (
  <svg {...base} {...p}><path d="M4 4h16l2 9v7H2v-7L4 4Z" strokeLinejoin="round" /><path d="M2 13h6l2 3h4l2-3h6" strokeLinejoin="round" /></svg>
);
