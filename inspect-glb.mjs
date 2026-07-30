/**
 * Reads only the JSON chunk of a GLB file (no Draco decoding needed).
 * Names are stored in the plain JSON header, not in the binary geometry.
 */
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, 'public/models/3d-map.draco.glb');

// GLB layout:
//   [0..11]  = 12-byte file header  (magic 4B, version 4B, length 4B)
//   [12..19] = JSON chunk header    (chunkLength 4B, chunkType 4B  0x4E4F534A = "JSON")
//   [20..]   = JSON chunk data      (chunkLength bytes)

const HEADER_SIZE   = 12;
const CHUNK_HDR     = 8;
const MAX_JSON_READ = 8 * 1024 * 1024; // read up to 8 MiB (JSON is usually well under 1 MiB)

const chunks = [];
let bytesRead = 0;
const target = HEADER_SIZE + CHUNK_HDR + MAX_JSON_READ;

await new Promise((resolve, reject) => {
  const stream = createReadStream(FILE, { start: 0, end: target - 1 });
  stream.on('data', c => { chunks.push(c); bytesRead += c.length; });
  stream.on('end', resolve);
  stream.on('error', reject);
});

const buf = Buffer.concat(chunks);

// Validate GLB magic "glTF"
const magic = buf.toString('ascii', 0, 4);
if (magic !== 'glTF') { console.error('Not a valid GLB file'); process.exit(1); }

const jsonChunkLen  = buf.readUInt32LE(12);
const jsonChunkType = buf.readUInt32LE(16);
if (jsonChunkType !== 0x4E4F534A) { console.error('First chunk is not JSON'); process.exit(1); }

const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
const gltf    = JSON.parse(jsonStr);

console.log('\n=== Node names ===');
const nodeNames = (gltf.nodes || []).map(n => n.name).filter(Boolean).sort();
nodeNames.forEach(n => console.log(' -', n));

console.log('\n=== Mesh names ===');
const meshNames = (gltf.meshes || []).map(m => m.name).filter(Boolean).sort();
meshNames.forEach(n => console.log(' -', n));

console.log(`\nTotal nodes: ${nodeNames.length}, meshes: ${meshNames.length}`);
