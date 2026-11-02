import React from 'react'

export default function Icon({ name, size = 20, strokeWidth = 1.7, className = '', ...props }) {
  const shapes = {
    arrow: <><path d="M4 12h16"/><path d="m13 5 7 7-7 7"/></>,
    upRight: <><path d="M6 18 18 6"/><path d="M8 6h10v10"/></>,
    down: <><path d="M12 4v16"/><path d="m5 13 7 7 7-7"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="M5 5l14 14M19 5 5 19"/></>,
    github: <><path d="M9 19c-4.5 1.5-4.5-2.5-6-3m12 6v-3.9c0-1 .2-1.7.7-2.2 2.3-.3 4.8-1.1 4.8-5.2 0-1.2-.4-2.2-1.2-3.1.1-.4.5-1.8-.2-3.4 0 0-1.1-.3-3.5 1.7a12.1 12.1 0 0 0-6.3 0C7 3.9 5.9 4.2 5.9 4.2c-.7 1.6-.3 3-.2 3.4A4.6 4.6 0 0 0 4.5 10.7c0 4 2.5 4.9 4.8 5.2.5.5.7 1.2.7 2.2V22"/></>,
    linkedin: <><rect x="3" y="9" width="4" height="12" rx=".5"/><path d="M5 3v2M11 21V9h4v2c.7-1.1 1.8-2 3.5-2 2.2 0 3.5 1.4 3.5 4.5V21h-4v-6.8c0-1.4-.5-2.1-1.6-2.1-1.1 0-1.4.9-1.4 2.1V21"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8 8 0 1 0 20.5 14.5z"/>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
    code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/></>,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 5-6 13 0 18M12 3c6 5 6 13 0 18"/></>,
    external: <><path d="M13 5h6v6M19 5l-9 9"/><path d="M19 14v5H5V5h5"/></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
    arrowLeft: <><path d="M20 12H4m7-7-7 7 7 7"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4h6v3M3 13h18"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"/></>,
    mouse: <><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/></>,
    terminal: <><rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 9 4 3-4 3m6 0h6"/></>,
  }
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{shapes[name] || shapes.spark}</svg>
}
