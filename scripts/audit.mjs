#!/usr/bin/env node
/**
 * Navigation coverage audit.
 *
 * The point of this script is to catch features nobody remembers. Every
 * affordance in the legacy site is a link, a `<select>` option, or a frameset
 * target — all machine-readable. So instead of trusting anyone's memory of what
 * the old app could do, we enumerate every destination it offered and check
 * that each one has a home in the new app.
 *
 * Anything printed under GAPS is something the original could reach and the
 * rebuild currently cannot.
 *
 * Usage:
 *   node scripts/audit.mjs --src "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const FOLDER_TO_COURSE = {
  LD: "ld", reading: "reading", basics: "basics", middle: "middle", adults: "adults",
  phonics: "phonics", grammar1: "grammar1", grammar2: "grammar2",
  Man: "man", Woman: "woman", Student: "student", CNN: "cnn", gva: null,
};

/** Destinations that are chrome, not content. */
const CHROME = /^(index|menu|cover|under|passoff)(\.html?)?$/i;

function decode(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("euc-kr").decode(buf);
  }
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const SRC = arg("--src");
if (!SRC || !fs.existsSync(SRC)) {
  console.error("error: --src <path to 본사 Lab v1.01> is required");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");

// --- what the new app currently has --------------------------------------
const have = new Set();
const lessonsDir = path.join(CONTENT, "lessons");
if (fs.existsSync(lessonsDir)) {
  for (const course of fs.readdirSync(lessonsDir)) {
    for (const file of fs.readdirSync(path.join(lessonsDir, course))) {
      if (file.endsWith(".json")) have.add(`${course}/${path.basename(file, ".json")}`);
    }
  }
}
if (have.size === 0) {
  console.error("error: no extracted content found. Run scripts/extract.mjs first.");
  process.exit(1);
}

// --- what the legacy site offered ----------------------------------------
const destinations = new Map(); // "course/id" -> Set of source pages
const external = new Map(); // non-lesson destinations -> Set of sources
let scanned = 0;

function record(map, key, source) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(source);
}

function resolveTarget(href, folder) {
  const clean = href.split("#")[0].split("?")[0].trim();
  if (!clean || clean.startsWith("mailto:") || /^https?:/i.test(clean)) return null;

  // Resolve relative to the folder the page lives in.
  const resolved = path.posix.normalize(path.posix.join(folder, clean.replace(/\\/g, "/")));
  const parts = resolved.split("/");
  const file = parts.pop();
  const dir = parts.join("/") || folder;
  if (CHROME.test(file)) return null;

  const course = FOLDER_TO_COURSE[dir];
  if (course === undefined) return { kind: "external", value: resolved };
  if (course === null) return { kind: "desktop", value: resolved };
  if (!/\.html?$/i.test(file)) return { kind: "external", value: resolved };
  return { kind: "lesson", value: `${course}/${file.replace(/\.html?$/i, "")}` };
}

for (const folder of Object.keys(FOLDER_TO_COURSE)) {
  const dir = path.join(SRC, folder);
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir)) {
    if (!/\.html?$/i.test(file)) continue;
    scanned++;
    const source = `${folder}/${file}`;
    const $ = cheerio.load(decode(fs.readFileSync(path.join(dir, file))));

    const hrefs = [
      ...$("a[href]").map((_, el) => $(el).attr("href")).get(),
      ...$("option[value]").map((_, el) => $(el).attr("value")).get(),
      ...$("frame[src]").map((_, el) => $(el).attr("src")).get(),
    ];

    for (const href of hrefs) {
      const target = resolveTarget(href, folder);
      if (!target) continue;
      if (target.kind === "lesson") record(destinations, target.value, source);
      else record(external, `${target.kind}: ${target.value}`, source);
    }
  }
}

// --- report ---------------------------------------------------------------
const gaps = [...destinations.keys()].filter((d) => !have.has(d)).sort();
const orphans = [...have].filter((h) => !destinations.has(h)).sort();

console.log(`legacy pages scanned      : ${scanned}`);
console.log(`lesson destinations found : ${destinations.size}`);
console.log(`present in the new app    : ${destinations.size - gaps.length}`);
console.log(`reachable but not linked  : ${orphans.length}`);
console.log();

if (gaps.length) {
  console.log(`GAPS — reachable in the original, missing here (${gaps.length}):`);
  for (const g of gaps.slice(0, 40)) {
    console.log(`  ${g}   ← ${[...destinations.get(g)].slice(0, 2).join(", ")}`);
  }
  if (gaps.length > 40) console.log(`  ... and ${gaps.length - 40} more`);
} else {
  console.log("GAPS: none — every lesson the legacy navigation pointed at exists in the app.");
}

if (external.size) {
  console.log();
  console.log(`Non-lesson destinations (${external.size}) — expected to be desktop/media:`);
  for (const [k, v] of [...external].slice(0, 12)) {
    console.log(`  ${k}   ← ${[...v][0]}`);
  }
  if (external.size > 12) console.log(`  ... and ${external.size - 12} more`);
}

if (orphans.length) {
  console.log();
  console.log(`Extracted but never linked from any menu (${orphans.length}):`);
  for (const o of orphans.slice(0, 15)) console.log(`  ${o}`);
  if (orphans.length > 15) console.log(`  ... and ${orphans.length - 15} more`);
}
