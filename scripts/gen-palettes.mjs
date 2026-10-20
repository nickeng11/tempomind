// Generates src/palettes.css from Tailwind's own color scales.
// Usage: npm run palettes   (also add new ids to src/lib/palettes.ts)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const project = process.argv[2] ?? process.cwd();
const theme = readFileSync(join(project, 'node_modules/tailwindcss/theme.css'), 'utf8');
const scale = (name) => {
  const out = {};
  for (const m of theme.matchAll(new RegExp(`--color-${name}-(\\d+):\\s*([^;]+);`, 'g'))) out[m[1]] = m[2].trim();
  if (!Object.keys(out).length) throw new Error(`no scale ${name}`);
  return out;
};

// [id, accent, accent2, base]. A ":1" suffix shifts that scale one shade darker so
// white button text keeps its contrast on lighter hues.
const PALETTES = [
  ['indigo', 'indigo', 'violet', 'zinc'],
  ['ocean', 'blue', 'sky:1', 'slate'],
  ['lagoon', 'teal:1', 'cyan:1', 'slate'],
  ['sunset', 'rose', 'orange:1', 'stone'],
  ['berry', 'fuchsia', 'pink', 'zinc'],
];

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const shifted = (spec) => {
  const [name, shift = '0'] = spec.split(':');
  const s = scale(name);
  return SHADES.map((shade, i) => [shade, s[SHADES[Math.min(i + Number(shift), SHADES.length - 1)]]]);
};

const vars = (accent, accent2, base) =>
  [['accent', accent], ['accent2', accent2], ['base', base]]
    .flatMap(([token, spec]) => shifted(spec).map(([shade, value]) => `  --color-${token}-${shade}: ${value};`))
    .join('\n');

const [, a, b, c] = PALETTES[0];
let css = `/* Generated from Tailwind's color scales. Tokens: accent (primary), accent2 (gradient partner), base (neutrals). */\n\n`;
css += `@theme {\n${vars(a, b, c)}\n}\n`;
for (const [id, accent, accent2, base] of PALETTES) {
  css += `\n[data-palette="${id}"] {\n${vars(accent, accent2, base)}\n}\n`;
}
writeFileSync(join(project, 'src/palettes.css'), css);
console.log(`wrote ${PALETTES.length} palettes`);

