export type Tone = {
  bar: string;
  wash: string;
  ink: string;
  on: string;
  line: string;
};

type Pair = { light: Tone; dark: Tone };

const CATEGORIES: Record<string, Pair> = {
  "cat-external": {
    light: { bar: "#0e7480", wash: "#e3f5f6", ink: "#083f45", on: "#f4fffe", line: "#8fced4" },
    dark: { bar: "#3ec4cf", wash: "#143236", ink: "#d9f7fa", on: "#062428", line: "#2f6d74" },
  },
  "cat-flow": {
    light: { bar: "#c24b34", wash: "#fde8e2", ink: "#6a2416", on: "#fff8f6", line: "#f0b09f" },
    dark: { bar: "#f09a82", wash: "#3a221c", ink: "#ffe6de", on: "#3a160f", line: "#8a4e3e" },
  },
};

const SECTIONS: Record<string, Pair> = {
  "sub-loco": {
    light: { bar: "#1f8a62", wash: "#e5f6ef", ink: "#0d4a34", on: "#f4fffa", line: "#8ed4b8" },
    dark: { bar: "#6ddebe", wash: "#143028", ink: "#d9fff2", on: "#06241a", line: "#2f6e58" },
  },
  "sub-ground": {
    light: { bar: "#6a8f2e", wash: "#f1f6e4", ink: "#334812", on: "#f9ffef", line: "#c3d992" },
    dark: { bar: "#c6e37a", wash: "#2a3018", ink: "#f3ffd4", on: "#24300c", line: "#5d7030" },
  },
  "sub-hang": {
    light: { bar: "#3a5fbf", wash: "#e7eefc", ink: "#1a3270", on: "#f6f8ff", line: "#a9bfef" },
    dark: { bar: "#9cb6f5", wash: "#1a2440", ink: "#e6edff", on: "#121a33", line: "#3d5696" },
  },
  "sub-level": {
    light: { bar: "#c47a1a", wash: "#fdf3e2", ink: "#6a3e08", on: "#fffaf2", line: "#efcb8a" },
    dark: { bar: "#f0c36a", wash: "#3a2c14", ink: "#fff2d4", on: "#332408", line: "#8a6830" },
  },
  "sub-play": {
    light: { bar: "#d13b7a", wash: "#fde8f1", ink: "#74193e", on: "#fff7fb", line: "#f3a8c6" },
    dark: { bar: "#f5a0c4", wash: "#3a1828", ink: "#ffe6f0", on: "#33101e", line: "#8a3d60" },
  },
  "sub-wave": {
    light: { bar: "#2f7ec8", wash: "#e6f3fc", ink: "#123e68", on: "#f5fbff", line: "#9dcef0" },
    dark: { bar: "#8ec8f5", wash: "#152838", ink: "#e5f5ff", on: "#0e2233", line: "#3a6a90" },
  },
  "sub-sequence": {
    light: { bar: "#7a4bb8", wash: "#f3eafb", ink: "#3d2064", on: "#fbf7ff", line: "#d0b4ee" },
    dark: { bar: "#d0b0f0", wash: "#2a1c3a", ink: "#f6ecff", on: "#241430", line: "#6a4a8a" },
  },
  "sub-improv": {
    light: { bar: "#d4532b", wash: "#feeee8", ink: "#722410", on: "#fff8f5", line: "#f4b8a4" },
    dark: { bar: "#f6b098", wash: "#3a2018", ink: "#ffeee8", on: "#33160e", line: "#8a5040" },
  },
  "sub-slow": {
    light: { bar: "#3d8f8a", wash: "#e7f5f4", ink: "#124844", on: "#f4fffe", line: "#9ed4d0" },
    dark: { bar: "#8eddd6", wash: "#14302e", ink: "#e5fffc", on: "#0c2826", line: "#3a706c" },
  },
};

const FALLBACK: Pair[] = [
  CATEGORIES["cat-external"],
  CATEGORIES["cat-flow"],
  SECTIONS["sub-hang"],
  SECTIONS["sub-level"],
  SECTIONS["sub-play"],
  SECTIONS["sub-sequence"],
];

function hash(id: string) {
  return [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export const SWATCHES = [
  "#0e7480",
  "#c24b34",
  "#1f8a62",
  "#6a8f2e",
  "#3a5fbf",
  "#c47a1a",
  "#d13b7a",
  "#2f7ec8",
  "#7a4bb8",
  "#d4532b",
  "#3d8f8a",
];

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number) {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(base: [number, number, number], toward: [number, number, number], amount: number): [number, number, number] {
  return [
    base[0] + (toward[0] - base[0]) * amount,
    base[1] + (toward[1] - base[1]) * amount,
    base[2] + (toward[2] - base[2]) * amount,
  ];
}

function luminance(rgb: [number, number, number]) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function toneFromHex(hex: string, theme: "light" | "dark"): Tone | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const bar = rgbToHex(rgb[0], rgb[1], rgb[2]);
  if (theme === "light") {
    const wash = mix(rgb, [255, 255, 255], 0.86);
    const ink = mix(rgb, [8, 8, 8], 0.62);
    const line = mix(rgb, [255, 255, 255], 0.48);
    return {
      bar,
      wash: rgbToHex(...wash),
      ink: rgbToHex(...ink),
      on: luminance(rgb) > 0.42 ? "#1c1b19" : "#f7fffe",
      line: rgbToHex(...line),
    };
  }
  const lifted = mix(rgb, [255, 255, 255], 0.42);
  const wash = mix(rgb, [16, 14, 12], 0.78);
  const ink = mix(rgb, [255, 255, 255], 0.78);
  const line = mix(rgb, [16, 14, 12], 0.42);
  return {
    bar: rgbToHex(...lifted),
    wash: rgbToHex(...wash),
    ink: rgbToHex(...ink),
    on: luminance(lifted) > 0.55 ? "#141210" : "#f7fffe",
    line: rgbToHex(...line),
  };
}

export function categoryTone(id: string, theme: "light" | "dark", color?: string | null): Tone {
  return (color ? toneFromHex(color, theme) : null) ?? (CATEGORIES[id] ?? FALLBACK[hash(id) % FALLBACK.length])[theme];
}

export function sectionTone(id: string, theme: "light" | "dark", color?: string | null): Tone {
  return (color ? toneFromHex(color, theme) : null) ?? (SECTIONS[id] ?? FALLBACK[hash(id) % FALLBACK.length])[theme];
}
