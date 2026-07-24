#!/usr/bin/env node
/**
 * Design-token guardrail.
 *
 * Fails if any component uses a hardcoded Tailwind palette color instead of a
 * design token from src/styles/tokens.css. See docs/03-DESIGN-SYSTEM.md:
 * "Never hardcode a hex value in a component." The palette is navy (--ink),
 * mint (--mint), foil/paper neutrals, and --rx red for prescription flags only.
 *
 * Usage:  node scripts/check-design-tokens.mjs
 * Exits 1 (and lists offenders) if any hardcoded palette class is found.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIR = join(ROOT, 'src');

// Every Tailwind color family + a numeric shade, e.g. `text-amber-600`,
// `from-red-500`, `bg-blue-50`. Tokens use var(--...), which never matches.
const PALETTE =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const LEGACY = new RegExp(`\\b${PALETTE}-(?:50|[1-9]00|950)\\b`, 'g');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      yield full;
    }
  }
}

let offenders = 0;
const report = [];

for await (const file of walk(SCAN_DIR)) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const matches = line.match(LEGACY);
    if (matches) {
      offenders += matches.length;
      report.push(`  ${relative(ROOT, file)}:${i + 1}  ${matches.join(', ')}`);
    }
  });
}

if (offenders > 0) {
  console.error(`\n✗ Found ${offenders} hardcoded palette color(s). Use design tokens instead:\n`);
  console.error(report.join('\n'));
  console.error(
    '\nMap to tokens from src/styles/tokens.css: --ink / --ink-70 / --ink-40 (text),' +
      '\n--paper / --paper-card / --foil / --foil-soft (surfaces), --mint / --mint-soft' +
      '\n(positive), --rx / --rx-soft (prescription flags ONLY). See docs/03-DESIGN-SYSTEM.md.\n'
  );
  process.exit(1);
}

console.log('✓ No hardcoded palette colors — all components use design tokens.');
