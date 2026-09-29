import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MAX_DIMENSION = 1440; // Max width or height in pixels (more than enough for 360x640 canvas on Retina)
const MIN_SIZE_TO_OPTIMIZE = 400 * 1024; // 400 KB

function scanImages(dir) {
  let list = [];
  if (!fs.existsSync(dir)) return list;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      list = list.concat(scanImages(full));
    } else if (/\.(png|jpe?g)$/i.test(item)) {
      list.push({ path: full, size: stat.size });
    }
  }
  return list;
}

export async function optimizeAllAssets(dryRun = false) {
  console.log(`Scanning assets... (dryRun=${dryRun})`);
  const allFiles = [...scanImages('src/assets'), ...scanImages('public/assets')];
  const seen = new Set();
  const files = [];
  for (const f of allFiles) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      files.push(f);
    }
  }
  let totalOrig = 0;
  let totalSaved = 0;
  let count = 0;

  for (const file of files) {
    try {
      const origSize = file.size;
      const meta = await sharp(file.path).metadata();
      const isOversized = (meta.width && meta.width > MAX_DIMENSION) || (meta.height && meta.height > MAX_DIMENSION);
      const isOverweight = origSize > MIN_SIZE_TO_OPTIMIZE;

      if (!isOversized && !isOverweight) continue;

      totalOrig += origSize;

      let pipeline = sharp(file.path);
      if (isOversized) {
        pipeline = pipeline.resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      const isPng = /\.png$/i.test(file.path);
      let outBuf;
      if (isPng) {
        outBuf = await pipeline.png({ compressionLevel: 9, quality: 85, effort: 7 }).toBuffer();
      } else {
        outBuf = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      }

      if (outBuf.length < origSize) {
        const saved = origSize - outBuf.length;
        totalSaved += saved;
        count++;

        console.log(`[${count}] ${path.basename(file.path)}: ${(origSize / 1024 / 1024).toFixed(2)}MB -> ${(outBuf.length / 1024 / 1024).toFixed(2)}MB (saved ${((saved / origSize) * 100).toFixed(1)}%)`);

        if (!dryRun) {
          fs.writeFileSync(file.path, outBuf);

          // Mirror to public/assets if present
          const relPath = path.relative('src/assets', file.path);
          const publicTarget = path.join('public/assets', relPath);
          if (fs.existsSync(publicTarget)) {
            fs.writeFileSync(publicTarget, outBuf);
          }
        }
      }
    } catch (err) {
      if (process.platform === 'darwin' && err.message.includes('heif')) {
        try {
          const { execSync } = await import('child_process');
          const tmp = `/tmp/sips_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          execSync(`sips -s format png -Z ${MAX_DIMENSION} "${file.path}" --out "${tmp}"`, { stdio: 'pipe' });
          const outBuf = await sharp(tmp).png({ compressionLevel: 9, quality: 85, effort: 7 }).toBuffer();
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          if (outBuf.length < file.size) {
            const saved = file.size - outBuf.length;
            totalSaved += saved;
            count++;
            console.log(`[${count}] ${path.basename(file.path)} (via sips): ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(outBuf.length / 1024 / 1024).toFixed(2)}MB (saved ${((saved / file.size) * 100).toFixed(1)}%)`);
            if (!dryRun) {
              fs.writeFileSync(file.path, outBuf);
              const relPath = path.relative('src/assets', file.path);
              const publicTarget = path.join('public/assets', relPath);
              if (fs.existsSync(publicTarget)) {
                fs.writeFileSync(publicTarget, outBuf);
              }
            }
          }
        } catch (sipsErr) {
          console.warn(`Could not optimize ${file.path} via sips:`, sipsErr.message);
        }
      } else {
        console.warn(`Could not optimize ${file.path}:`, err.message);
      }
    }
  }

  console.log('----------------------------------------');
  console.log(`Optimized ${count} files.`);
  console.log(`Original total: ${(totalOrig / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total saved: ${(totalSaved / 1024 / 1024).toFixed(1)} MB`);
  console.log(`New total: ${((totalOrig - totalSaved) / 1024 / 1024).toFixed(1)} MB`);
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('optimize-assets.js')) {
  const isDry = process.argv.includes('--dry');
  optimizeAllAssets(isDry);
}
