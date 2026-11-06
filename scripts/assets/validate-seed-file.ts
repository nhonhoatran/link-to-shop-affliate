import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedFileSchema, type SeedImage } from '../../packages/shared/src/seed-file-schema';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seedDir = resolve(repoRoot, 'seed');
const seedPath = process.argv[2] ? resolve(process.argv[2]) : resolve(seedDir, 'sample-outfits.json');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const errors: string[] = [];

function readPngSize(path: string): { width: number; height: number } | null {
  const buf = readFileSync(path);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function checkImage(label: string, image: SeedImage): void {
  const path = resolve(seedDir, image.file);
  if (!existsSync(path)) {
    errors.push(`${label}: file not found: ${image.file}`);
    return;
  }
  const size = readPngSize(path);
  if (!size) {
    errors.push(`${label}: not a PNG: ${image.file}`);
    return;
  }
  if (size.width !== image.width || size.height !== image.height) {
    errors.push(
      `${label}: size mismatch for ${image.file}: json ${image.width}x${image.height}, file ${size.width}x${size.height}`,
    );
  }
}

function main(): number {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(seedPath, 'utf8'));
  } catch (error) {
    console.error(`Cannot read ${seedPath}: ${(error as Error).message}`);
    return 1;
  }
  const parsed = seedFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`schema: ${issue.path.join('.')}: ${issue.message}`);
  } else {
    for (const outfit of parsed.data.outfits) {
      checkImage(`${outfit.slug}.modelImage`, outfit.modelImage);
      const ids = new Set<string>();
      for (const item of outfit.items) {
        if (ids.has(item.id)) errors.push(`${outfit.slug}: duplicate item id ${item.id}`);
        ids.add(item.id);
        checkImage(`${outfit.slug}.${item.id}`, item.image);
      }
      console.log(`${outfit.slug}: ${outfit.items.length} items, status=${outfit.status}, featured=${outfit.featured}`);
    }
  }
  if (errors.length > 0) {
    console.error(`FAILED (${errors.length} problems):\n- ${errors.join('\n- ')}`);
    return 1;
  }
  console.log('OK: seed file matches schema, all image files exist with matching dimensions');
  return 0;
}

process.exit(main());
