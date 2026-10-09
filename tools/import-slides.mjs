#!/usr/bin/env node
/**
 * Import downloaded originals from Google Drive "ПРЕЗА" into an offline slide folder.
 * Zero dependencies. Does not modify original source files.
 *
 * Usage:
 *   node tools/import-slides.mjs "/path/to/downloaded/ПРЕЗА"
 */
import { readFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = process.argv[2] ? resolve(process.argv[2]) : '';
if (!sourceDir) {
  console.error('Укажите путь к скачанной папке «ПРЕЗА»: node tools/import-slides.mjs "<путь>"');
  process.exit(2);
}

const manifest = JSON.parse(await readFile(join(root, 'data/slides.json'), 'utf8'));
const destDir = join(root, 'assets', 'slides');
const errors = [];
const jobs = [];

for (const slide of manifest.slides) {
  const from = join(sourceDir, slide.sourceFilename);
  const to = join(root, slide.localImagePath);
  try {
    await stat(from);
    const header = (await readFile(from)).subarray(0, 24);
    const pngSig = Buffer.from([137,80,78,71,13,10,26,10]);
    if (!header.subarray(0,8).equals(pngSig)) throw new Error('not a PNG');
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    if (Math.abs(width / height - 16 / 9) > 0.03) {
      throw new Error(`unexpected aspect ratio ${width}×${height}`);
    }
    jobs.push({ from, to, id: slide.id, width, height });
  } catch (e) {
    errors.push(`${slide.id}: ${slide.sourceFilename} (${e.message})`);
  }
}

if (errors.length) {
  console.error('Не всё найдено или корректно; ничего не копирую:\n' + errors.join('\n'));
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
for (const job of jobs) {
  await copyFile(job.from, job.to);
  console.log(`${job.id}: ${job.width}×${job.height} → ${job.to}`);
}
console.log(`Готово: ${jobs.length} PNG скопировано локально.\nВНИМАНИЕ: в исходном PNG 25 финальная фраза обрывается; его исправление — отдельный шаг.`);
