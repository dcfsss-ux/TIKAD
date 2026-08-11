/**
 * compress-map-buildings.mjs
 *
 * Batch-compress every GLB in /public/models/map/ with Draco geometry
 * compression using @gltf-transform.
 *
 * Output: files are compressed IN-PLACE (overwrites originals).
 * Tiny/stub files (<5 KB) are skipped automatically.
 *
 * Usage:
 *   node scripts/compress-map-buildings.mjs
 */

import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODELS_DIR = join(ROOT, 'public', 'models', 'map');

// Skip files smaller than 5 KB (empty stubs / diagnostic placeholders)
const MIN_SIZE_BYTES = 5_000;

async function main() {
  const encoderModule = await draco3d.createEncoderModule();
  const decoderModule = await draco3d.createDecoderModule();

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': encoderModule,
      'draco3d.decoder': decoderModule,
    });

  const files = (await readdir(MODELS_DIR))
    .filter(f => f.toLowerCase().endsWith('.glb'));

  console.log(`\n🗂  Found ${files.length} GLB files in ${MODELS_DIR}\n`);

  let skipped = 0;
  let compressed = 0;
  let failed = 0;
  const results = [];

  for (const file of files) {
    const filePath = join(MODELS_DIR, file);
    const info = await stat(filePath);
    const sizeMB = (info.size / 1_048_576).toFixed(1);

    if (info.size < MIN_SIZE_BYTES) {
      console.log(`⏭  SKIP  ${file}  (${info.size} bytes — stub/empty)`);
      skipped++;
      results.push({ file, status: 'skipped', reason: 'stub', before: info.size });
      continue;
    }

    process.stdout.write(`⚙️  Compressing  ${file}  (${sizeMB} MB)...`);

    try {
      const document = await io.read(filePath);

      await document.transform(
        draco({
          encoderModule,
          quantizePosition:   14,  // high precision for geo-accurate campus models
          quantizeNormal:     10,
          quantizeTexcoord:   12,
          quantizeColor:      8,
          quantizeGeneric:    12,
        })
      );

      const compressed_buf = await io.writeBinary(document);
      await writeFile(filePath, compressed_buf);

      const newSize = compressed_buf.byteLength;
      const ratio = ((1 - newSize / info.size) * 100).toFixed(1);
      console.log(` ✅  ${(newSize / 1_048_576).toFixed(1)} MB  (saved ${ratio}%)`);
      compressed++;
      results.push({ file, status: 'ok', before: info.size, after: newSize, ratio });
    } catch (err) {
      console.log(` ❌  FAILED: ${err.message}`);
      failed++;
      results.push({ file, status: 'failed', error: err.message });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalBefore = results.filter(r => r.before && r.after).reduce((s, r) => s + r.before, 0);
  const totalAfter  = results.filter(r => r.before && r.after).reduce((s, r) => s + r.after,  0);
  const savedMB = ((totalBefore - totalAfter) / 1_048_576).toFixed(1);
  const overallRatio = totalBefore > 0
    ? ((1 - totalAfter / totalBefore) * 100).toFixed(1)
    : '0';

  console.log(`
==================================================
         Draco Compression Summary
==================================================
  Compressed : ${compressed}
  Skipped    : ${skipped}
  Failed     : ${failed}
  Space saved: ${savedMB} MB
  Overall    : ${overallRatio}% smaller
==================================================
`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});
