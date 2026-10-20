// Colour schemes. The CSS for each lives in src/palettes.css (generated from
// Tailwind's colour scales) and is selected with a data-palette attribute.
export const PALETTES = [
  { id: 'indigo', name: 'Indigo Dusk', description: 'Indigo → violet · cool grey' },
  { id: 'ocean', name: 'Ocean', description: 'Blue → sky · slate' },
  { id: 'lagoon', name: 'Lagoon', description: 'Teal → cyan · slate' },
  { id: 'sunset', name: 'Sunset', description: 'Rose → orange · warm stone' },
  { id: 'berry', name: 'Berry', description: 'Fuchsia → pink · cool grey' },
] as const;

export type PaletteId = (typeof PALETTES)[number]['id'];

const STORAGE_KEY = 'tempomind.palette';

export function currentPalette(): PaletteId {
  const id = document.documentElement.dataset.palette;
  return PALETTES.some((p) => p.id === id) ? (id as PaletteId) : 'indigo';
}

export function applyPalette(id: PaletteId) {
  document.documentElement.dataset.palette = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Still applies for this visit.
  }
}
