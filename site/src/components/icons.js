const paths = {
  atom: '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-40 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(40 12 12)"/><circle cx="12" cy="12" r="1.6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  book: '<path d="M12 6C9.5 4 6 3.5 3 4.5v14c3-1 6.5-.5 9 1.5 2.5-2 6-2.5 9-1.5v-14C18 3.5 14.5 4 12 6Zm0 0v14"/>',
  note: '<path d="M6 3h12v18H6Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  spark: '<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1.5 6"/><path d="M4 4v6h6"/>',
  play: '<path d="M8 5.5v13l10-6.5Z" fill="currentColor"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  check: '<path d="m5 12.5 4 4L19 7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5M12 17h.01"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.atom}</svg>`;
