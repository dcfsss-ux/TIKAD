/**
 * compress-map-buildings.mjs
 *
 * Batch-compress every GLB in /public/models/map/ with Draco geometry
 * compression and KTX2 (ETC1S) texture compression using @gltf-transform.
 *
 * Output: files are compressed IN-PLACE (overwrites originals).
 * Tiny/stub files (<5 KB) are skipped automatically.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODELS_DIR = join(ROOT, 'public', 'models', 'map');

// Skip files smaller than 5 KB (empty stubs / diagnostic placeholders)
const MIN_SIZE_BYTES = 5_000;

async function main() {
  try {
    execSync('toktx --version', { stdio: 'ignore' });
  } catch (err) {
    console.error('\n❌ CRITICAL: KTX-Software (toktx) is not installed or not in PATH.');
    console.error('Please install from: https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2');
    console.error('Ensure "Command line tools" are checked and added to PATH during installation.\n');
    process.exit(1);
  }

  const files = (await readdir(MODELS_DIR)).filter(f => f.toLowerCase().endsWith('.glb'));

  console.log(`\n🗂  Found ${files.length} GLB files in ${MODELS_DIR}\n`);

  let skipped = 0, compressed = 0, failed = 0;
  const results = [];

  for (const file of files) {
    const filePath = join(MODELS_DIR, file);
    const info = await stat(filePath);
    const sizeMB = (info.size / 1_048_576).toFixed(1);

    if (info.size < MIN_SIZE_BYTES) {
      console.log(`⏭  SKIP  ${file}  (${info.size} bytes — stub/empty)`);
      skipped++;
      results.push({ file, status: 'skipped', before: info.size });
      continue;
    }

    process.stdout.write(`⚙️  Compressing  ${file}  (${sizeMB} MB)...`);

    try {
      // Execute gltf-transform CLI for Draco + KTX2 optimization
      // Downscales textures to max 1024x1024 to save VRAM
      execSync(`npx gltf-transform optimize "${filePath}" "${filePath}" --compress draco --texture-compress ktx2 --texture-size 1024`, { stdio: 'pipe' });
      
      const newInfo = await stat(filePath);
      const ratio = ((1 - newInfo.size / info.size) * 100).toFixed(1);
      console.log(` ✅  ${(newInfo.size / 1_048_576).toFixed(1)} MB  (saved ${ratio}%)`);
      compressed++;
      results.push({ file, status: 'ok', before: info.size, after: newInfo.size });
    } catch (err) {
      console.log(` ❌  FAILED`);
      if (err.stdout) console.error(err.stdout.toString());
      if (err.stderr) console.error(err.stderr.toString());
      failed++;
    }
  }

  // Summary
  const totalBefore = results.filter(r => r.before && r.after).reduce((s, r) => s + r.before, 0);
  const totalAfter  = results.filter(r => r.before && r.after).reduce((s, r) => s + r.after,  0);
  const savedMB = ((totalBefore - totalAfter) / 1_048_576).toFixed(1);
  const overallRatio = totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';

  console.log(`
==================================================
         Compression Summary (Draco + KTX2)
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
