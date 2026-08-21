/**
 * Unit tests for content.js error extraction helpers (Node-compatible copy).
 * Run: node fixforce/extension/test-content-scan.js
 */

function normalizeText(text) {
  return String(text || "")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const UI_NOISE_STOP = [
  /\bView profile\b/i,
  /\bEmpty Cache\b/i,
  /\bObject Manager\b/i,
  /\bNamed Credentials\b/i,
  /\bError ID:\b/i,
];

function trimErrorNoise(text) {
  let out = normalizeText(text);
  for (const p of UI_NOISE_STOP) {
    const m = out.match(p);
    if (m && m.index > 20) out = out.slice(0, m.index).trim();
  }
  return out.slice(0, 600);
}

function extractInlineValidationMessage(text) {
  const t = normalizeText(text);
  const review = t.match(
    /(?:we hit a snag\.?\s*)?review the errors on this page[.\s*]*(.{1,220})/i
  );
  if (review?.[1]) {
    const msg = trimErrorNoise(review[1]);
    if (msg) return trimErrorNoise(`We hit a snag. Review the errors on this page. ${msg}`);
  }
  return null;
}

const cases = [
  {
    name: "CPQ inline validation (TEST Fixforce)",
    input: "We hit a snag. Review the errors on this page. * TEST Fixforce",
    expect: "TEST Fixforce",
  },
  {
    name: "With page noise after message",
    input:
      "We hit a snag. Review the errors on this page. * TEST Fixforce View profile Setup Object Manager",
    expect: "TEST Fixforce",
  },
];

let passed = 0;
for (const c of cases) {
  const result = extractInlineValidationMessage(c.input);
  const ok = result && result.includes(c.expect);
  if (ok) passed++;
  console.log(`${ok ? "✓" : "✗"} ${c.name}`);
  if (!ok) console.log(`  got: ${result}`);
}

if (passed !== cases.length) process.exit(1);
console.log(`${passed}/${cases.length} content scan tests passed`);
