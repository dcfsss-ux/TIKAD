/**
 * Draco compression script for large GLB files (>2 GiB).
 * Uses streaming to bypass Node.js's 2 GiB readFile limit.
 * Disables internal weld to avoid OOM on huge files.
 */

import { NodeIO } from '@gltf-transform/core';
import { draco } from '@gltf-transform/functions';
import { KHRDracoMeshCompression, ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { stat, unlink } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INPUT  = join(__dirname, 'public/models/map.glb');
const OUTPUT = join(__dirname, 'public/models/3d-map.draco.glb');

console.log('⏳ Reading (streaming):', INPUT);

const { size } = await stat(INPUT);
console.log(`   File size: ${(size / 1024 / 1024 / 1024).toFixed(2)} GiB`);

// Stream the file into a Buffer (chunks) to bypass 2 GiB readFile limit
function readLargeFile(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(filePath);
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const buffer = await readLargeFile(INPUT);
console.log('✅ File streamed into memory. Parsing GLB...');

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });

// Parse binary GLB from buffer
const document = await io.readBinary(new Uint8Array(buffer));
console.log('✅ GLB parsed. Applying Draco compression (weld disabled)...');

await document.transform(
  draco({
    encodeSpeed:       5,
    decodeSpeed:       5,
    method:            KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
    quantizePosition:  14,
    quantizeNormal:    10,
    quantizeTexcoord:  12,
    quantizeColor:      8,
    quantizeGeneric:   12,
    weld:              false,   // disable auto-weld to avoid OOM on large files
  })
);

console.log('✅ Compression applied. Writing output:', OUTPUT);

await io.write(OUTPUT, document);

console.log('🎉 Done! Draco-compressed file written to:', OUTPUT);

// Remove the heavy source file
await unlink(INPUT);
console.log('🗑️  Removed source file:', INPUT);
