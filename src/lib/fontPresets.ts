export interface FontPreset {
  id: string;
  label: string;
  display: string;
  body: string;
}

/** Every family here beyond the app's defaults (Fraunces/Inter) is already loaded via the Google Fonts link in index.html. */
export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'editorial',
    label: 'Editorial (default)',
    display: '"Fraunces", "Iowan Old Style", serif',
    body: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'classic',
    label: 'Classic Serif',
    display: '"Playfair Display", Georgia, serif',
    body: '"Source Serif 4", Georgia, serif',
  },
  {
    id: 'modern',
    label: 'Modern Sans',
    display: '"Inter", ui-sans-serif, system-ui, sans-serif',
    body: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: 'mono',
    label: 'Monospace',
    display: '"IBM Plex Mono", ui-monospace, monospace',
    body: '"IBM Plex Mono", ui-monospace, monospace',
  },
];

export function applyFontPreset(id: string | null) {
  const root = document.documentElement.style;
  const preset = FONT_PRESETS.find((p) => p.id === id);
  if (!preset) {
    root.removeProperty('--font-display');
    root.removeProperty('--font-body');
    return;
  }
  root.setProperty('--font-display', preset.display);
  root.setProperty('--font-body', preset.body);
}
