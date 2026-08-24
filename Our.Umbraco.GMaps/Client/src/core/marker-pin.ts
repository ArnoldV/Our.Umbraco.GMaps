import type { Marker } from '../types.js';

/** Google's own pin colour, used for a marker with no colour of its own. */
export const DEFAULT_PIN_BACKGROUND = '#ea4335';

const LIGHT_TEXT = '#ffffff';
const DARK_TEXT = '#1b1b1b';

/** Everything needed to draw one numbered, coloured pin. */
export interface PinSpec {
  /** The marker's 1-based position, shown on the pin and on the chip. */
  glyph: string;
  background: string;
  borderColor: string;
  glyphColor: string;
}

/** Parses #rgb and #rrggbb, with or without the hash. */
function parseHex(color: string | undefined): [number, number, number] | undefined {
  if (!color) return undefined;
  const hex = color.trim().replace(/^#/, '');
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return undefined;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

function toHex(channels: [number, number, number]): string {
  const hex = channels
    .map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * A stored colour in a form CSS and the Maps SDK both accept, or undefined.
 * Umbraco's colour picker stores bare hex (`e61414`), which is not valid CSS.
 */
export function normaliseHexColor(value: string | undefined): string | undefined {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb) : undefined;
}

/** A glyph colour readable against the given pin background. */
export function contrastingTextColor(background: string | undefined): string {
  const rgb = parseHex(background);
  if (!rgb) return LIGHT_TEXT;
  return luminance(rgb) > 0.45 ? DARK_TEXT : LIGHT_TEXT;
}

/** A darker shade of the same hue. */
export function darken(color: string | undefined, amount = 0.3): string {
  const rgb = parseHex(color);
  if (!rgb) return DEFAULT_PIN_BACKGROUND;
  return toHex(rgb.map((c) => c * (1 - amount)) as [number, number, number]);
}

/** How a marker should be drawn at the given zero-based position in the list. */
export function pinSpecFor(marker: Pick<Marker, 'color'>, index: number): PinSpec {
  const background = normaliseHexColor(marker.color) ?? DEFAULT_PIN_BACKGROUND;
  return {
    glyph: String(index + 1),
    background,
    borderColor: darken(background),
    glyphColor: contrastingTextColor(background),
  };
}

/** Stable identity for a spec, so an unchanged pin is not rebuilt. */
export function pinSpecKey(spec: PinSpec): string {
  return `${spec.glyph}|${spec.background}|${spec.borderColor}|${spec.glyphColor}`;
}
