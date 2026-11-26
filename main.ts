// Hearth & Ledger — hand-in program (Node 22, standard library only).
//
// What it hands in: the site in app/ (static files, ES modules, no
// build step, no network at all) plus the screenshots in screenshots/,
// and a dossier.json the judge reads — the screenshots, the files and
// bytes of the first load, and the source — built by the vendored
// make.fun library in vendor/makefun-frontend.ts. That vendored file
// stays exactly as the kit shipped it: the scorer only accepts a
// dossier byte-identical to what its own copy of the library writes.
//
// The flow: find the repo, empty the output directory, check the
// screenshots against the competition's limits, copy the site and the
// shots across, then confirm the handover is whole before writing the
// dossier. A failure anywhere stops the run with a plain error instead
// of handing in half a site.
//
// Local test: `node serve.ts`, open http://localhost:8080. The grader
// sets MAKEFUN_OUTPUT_DIR to /output; locally it can point anywhere:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repo may be the working directory, or the grader may have mounted
// it at $MAKEFUN_BOT_DIR (or /bot) while running from elsewhere. Take
// the first candidate that actually holds the site and its screenshots.
function findRepoRoot(): string {
  const self = fileURLToPath(new URL('.', import.meta.url));
  const places = [process.env.MAKEFUN_BOT_DIR, self, '/bot'].filter(Boolean) as string[];
  for (const p of places) {
    if (existsSync(join(p, 'app', 'index.html')) && existsSync(join(p, 'screenshots'))) return p;
  }
  return self;
}

const repoRoot = findRepoRoot();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty the output directory so a previous run's files can never leak
// into this handover. Only the entries inside go away — the directory
// itself stays put, because on the grader /output is a mounted volume
// and removing a mount point dies with EBUSY ("Device or resource
// busy"), which used to kill the whole run before it started.
function emptyOutputDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

// Dimensions straight from the header bytes — no image library needed.
// PNG keeps them in the IHDR chunk; JPEG in the first start-of-frame
// marker (SOF0/SOF2 and friends, skipping the Huffman tables).
function readShotSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error(`cannot read dimensions of ${file}`);
}

// The competition's own limits for screenshots: 3 or 4 files, none
// over 256 KiB, long side at most 1280 px, short side at least 360 px.
function validateShotDir(dir: string): string[] {
  const files = readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
  if (files.length < 3 || files.length > 4) {
    throw new Error(`screenshots: expected 3-4 files, found ${files.length}`);
  }
  for (const name of files) {
    const file = join(dir, name);
    const bytes = statSync(file).size;
    if (bytes > 262144) throw new Error(`screenshots/${name}: ${bytes} bytes, over the 256 KiB cap`);
    const { width, height } = readShotSize(file);
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    if (longSide > 1280) throw new Error(`screenshots/${name}: long side ${longSide}px, over 1280`);
    if (shortSide < 360) throw new Error(`screenshots/${name}: short side ${shortSide}px, under 360`);
  }
  return files;
}

// Every file under a directory, depth-first and sorted, so the count in
// the final summary is stable from run to run.
function collectAppFiles(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...collectAppFiles(full, `${prefix}${name}/`));
    else found.push(`${prefix}${name}`);
  }
  return found;
}

emptyOutputDir(outDir);
const shotNames = validateShotDir(join(repoRoot, 'screenshots'));
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Confirm the handover before the dossier is built: the entry page and
// every screenshot must actually be in the output directory.
if (!existsSync(join(outDir, 'app', 'index.html'))) {
  throw new Error('handover incomplete: app/index.html is missing from the output');
}
for (const name of shotNames) {
  if (!existsSync(join(outDir, 'screenshots', name))) {
    throw new Error(`handover incomplete: screenshots/${name} is missing from the output`);
  }
}
const handedFiles = collectAppFiles(join(outDir, 'app'));
const dossierPath = join(outDir, 'dossier.json');

writeFileSync(
  dossierPath,
  buildDossier(outDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);

const dossierBytes = statSync(dossierPath).size;
if (dossierBytes === 0) throw new Error('dossier.json was written empty');
// The dossier must be readable JSON, not a truncated write: parse what
// was just written and confirm it names this site's screenshots.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const dossierShots = dossier?.screenshots ?? dossier?.images ?? [];
if (Array.isArray(dossierShots) && dossierShots.length !== shotNames.length) {
  throw new Error(`dossier.json names ${dossierShots.length} screenshots, expected ${shotNames.length}`);
}

console.log(`Hearth & Ledger handed in: ${handedFiles.length} app files, ${shotNames.length} screenshots (${shotNames.join(', ')}), dossier ${dossierBytes} bytes at ${dossierPath}.`);
