/* Hand-drawn monochrome structure icons (24x24 viewBox, stroke-based). */

const S = (inner: string, vb = '0 0 24 24') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ICONS: Record<string, string> = {
  village: S('<path d="M3 11 12 3l9 8"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/>'),
  outpost: S('<path d="M8 21V8l8-3v16"/><path d="M10 21h4"/><path d="M8 8l-2 2 2 2"/><path d="M16 5l2 2-2 2"/><path d="M5 21h14"/>'),
  desert_pyramid: S('<path d="M12 3 3 21h18L12 3Z"/><path d="M12 9v4"/><path d="M9 21v-4h6v4"/><path d="M12 3l-2 6h4l-2-6Z"/>'),
  jungle_temple: S('<path d="M12 3l9 10h-4.5l-4.5-5-4.5 5H3l9-10Z"/><path d="M12 13v4"/><path d="M9 21v-4h6v4"/><path d="M8 17h2"/><path d="M14 17h2"/>'),
  swamp_hut: S('<path d="M5 13 12 6l7 7"/><path d="M7 13v8h10v-8"/><path d="M7 15h10"/><path d="M8 21v-6h8v6"/><path d="M6 21v-6M18 21v-6" transform="translate(0 0)"/>'),
  igloo: S('<path d="M4 15a8 8 0 0 1 16 0"/><path d="M12 7v8"/><path d="M9 15v-2h6v2"/><path d="M4 15h16"/>'),
  monument: S('<path d="M5 5h14v4H5z"/><path d="M6 9v10h12V9"/><path d="M9 9v7M12 9v8M15 9v7"/><path d="M5 19h14"/>'),
  mansion: S('<path d="M2 12 12 3l10 9"/><path d="M5 11v10h14V11"/><path d="M10 21v-6h4v6"/><path d="M8 15h2M14 15h2"/>'),
  stronghold: S('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>'),
  mineshaft: S('<path d="M4 8h16M4 16h16"/><path d="M7 8v8M12 8v8M17 8v8"/><path d="M4 5v3M20 5v3M4 16v3M20 16v3"/>'),
  shipwreck: S('<path d="M4 15c2-3 4-4 8-4s6 1 8 4"/><path d="M4 15v3h16v-3"/><path d="M12 11v8"/><path d="M12 11l3-4"/><path d="M12 7l-1.5 1.5L12 10l1.5-1.5L12 7Z"/>'),
  ocean_ruin: S('<path d="M5 3v13"/><path d="M5 6h3v10H5"/><path d="M8 10c3 1 5 0 8-1v4"/><path d="M16 9v7"/><path d="M16 12h2v4h-2"/><path d="M4 21h16"/>'),
  treasure: S('<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9c0-3 4-5 8-5s8 2 8 5"/><path d="M12 9v8"/><path d="M9 14l3 3 3-3"/>'),
  ruined_portal: S('<path d="M7 3v18"/><path d="M17 3v18"/><path d="M7 3h3M17 3h-3"/><path d="M7 21h3M17 21h-3"/><path d="M12 7v4"/><path d="M10.5 9h3"/>'),
  ancient_city: S('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'),
  trail_ruins: S('<path d="M7 3h10M8 6h8"/><path d="M9 6v4h6V6"/><path d="M7 10h10v3H7z"/><path d="M8 13h8v5H8z"/><path d="M7 18h10v3H7z"/>'),
  trial_chambers: S('<rect x="3" y="7" width="18" height="10" rx="1"/><path d="M6 7V4h12v3"/><rect x="9" y="11" width="6" height="6" rx="1"/><path d="M3 21h18"/>'),
  desert_well: S('<path d="M6 3h12v4H6z"/><path d="M8 7v3M16 7v3"/><path d="M12 10v8"/><path d="M9 21v-3h6v3"/><path d="M9 12h6"/>'),
  fortress: S('<path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-5h6v5"/><path d="M8 8h8M8 12h8M8 16h8"/>'),
  bastion: S('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8l3-3 3 3"/><path d="M10 12h4v6h-4z"/><path d="M7 12h2M15 12h2"/>'),
  end_city: S('<path d="M9 21V9l3-3 3 3v12"/><path d="M12 3l-1.5 3h3L12 3Z"/><path d="M10 9h4M10 13h4M10 17h4"/>'),
  end_gateway: S('<circle cx="12" cy="12" r="8"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/><path d="M12 10l2 2-2 2-2-2 2-2Z"/>'),
  spawn: S('<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>'),
  slime: S('<rect x="5" y="8" width="14" height="10" rx="4"/><circle cx="9.5" cy="12.5" r="1" fill="currentColor"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/><path d="M9.5 15.5c1.5 1 3.5 1 5 0"/>'),
};

export function iconDataUrl(key: string, color = '#ffffff'): string {
  const svg = ICONS[key] ?? ICONS.spawn;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('currentColor', color))}`;
}