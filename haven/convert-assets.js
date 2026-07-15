1// convert-assets.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

const PUBLIC_DIR = './public';
const MAPS_DIR = './public/maps';

// Helper to find files recursively
async function getFiles(dir, ext) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res, ext) : res;
    })
  );
  return files.flat().filter(f => f.endsWith(ext));
}

// Convert PNG to WebP using cwebp
async function convertPngToWebp(filePath) {
  const destPath = filePath.replace(/\.png$/, '.webp');
  const isSpawnScreen = filePath.includes('spawnScreen');
  const cmd = isSpawnScreen
    ? `cwebp -q 90 "${filePath}" -o "${destPath}"`
    : `cwebp -lossless "${filePath}" -o "${destPath}"`;
  try {
    await execPromise(cmd);
    console.log(`✅ Converted (${isSpawnScreen ? 'lossy q90' : 'lossless'}): ${path.basename(filePath)} -> ${path.basename(destPath)}`);
  } catch (err) {
    console.error(`❌ Failed converting ${filePath}:`, err.message);
  }
}

async function main() {
  console.log('Starting WebP conversion...');

  // A. Find and convert top-level PNGs in /public
  const topLevelPngs = (await readdir(PUBLIC_DIR))
    .filter(f => f.endsWith('.png'))
    .map(f => path.join(PUBLIC_DIR, f));

  // B. Find and convert PNGs in /public/maps
  const mapPngs = await getFiles(MAPS_DIR, '.png');
  const allPngs = [...topLevelPngs, ...mapPngs];

  console.log(`Found ${allPngs.length} PNG images to convert.`);
  for (const png of allPngs) {
    await convertPngToWebp(png);
  }

  // C. Update references in TMJ and TSJ files
  console.log('\nUpdating references in map files...');
  const tmjFiles = await getFiles(MAPS_DIR, '.tmj');
  const tsjFiles = await getFiles(MAPS_DIR, '.tsj');
  const allJsonMapFiles = [...tmjFiles, ...tsjFiles];

  for (const file of allJsonMapFiles) {
    try {
      const content = await readFile(file, 'utf8');
      const updated = content.replace(/\.png/g, '.webp');
      if (content !== updated) {
        await writeFile(file, updated, 'utf8');
        console.log(`✅ Updated references in: ${path.basename(file)}`);
      }
    } catch (err) {
      console.error(`❌ Failed updating references in ${file}:`, err);
    }
  }

  console.log('\nOptimization complete! All PNGs converted and map references updated.');
}

main().catch(console.error);
