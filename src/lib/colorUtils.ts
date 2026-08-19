/** Darkens a #rrggbb hex color by subtracting a flat amount (0-255) from each channel. */
export function darken(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, (num >> 16 & 0xff) - amount);
  const g = Math.max(0, (num >> 8 & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Applies (or clears) the user's custom accent color as CSS custom property overrides. */
export function applyAccentColor(hex: string | null) {
  const root = document.documentElement.style;
  if (!hex) {
    root.removeProperty('--color-harbor');
    root.removeProperty('--color-harbor-dark');
    return;
  }
  root.setProperty('--color-harbor', hex);
  root.setProperty('--color-harbor-dark', darken(hex, 30));
}
