import fs from 'fs';
import path from 'path';

/**
 * Pre-build script to generate a static lessons manifest for Vercel deployment.
 * This bundles all lessons into a single flat JSON array that can be fetched at runtime.
 * Run this before `vite build`: node scripts/generate-lessons-manifest.js
 */

const lessonsDir = path.resolve(process.cwd(), 'lessons');
const outputPath = path.resolve(process.cwd(), 'public', 'lessons-data.json');

function getLessons(dir) {
    if (!fs.existsSync(dir)) return [];

    const results = [];
    const folders = fs.readdirSync(dir).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    folders.forEach(folder => {
        const folderPath = path.join(dir, folder);
        const stat = fs.statSync(folderPath);
        if (!stat.isDirectory()) return;

        const lessonFile = path.join(folderPath, 'lesson.json');
        if (!fs.existsSync(lessonFile)) return;

        let content = {};
        try {
            content = JSON.parse(fs.readFileSync(lessonFile, 'utf-8'));
        } catch (e) {
            console.error(`Error reading ${lessonFile}:`, e);
        }

        // Parse order from folder name (e.g. "01-Potions" -> order 1)
        const match = folder.match(/^(\d+)-(.*)$/);
        const order = match ? parseInt(match[1], 10) : 99;
        const name = match ? match[2] : folder;

        results.push({
            name: folder,
            type: 'file',
            path: path.relative(process.cwd(), lessonFile),
            title: content.title || name,
            description: content.description || '',
            visible: content.visible !== false,
            order: order,
            content: content // Embed full lesson content for Vercel
        });
    });

    // Sort by order
    results.sort((a, b) => a.order - b.order);
    return results;
}

console.log('Generating lessons manifest...');
const lessons = getLessons(lessonsDir);
fs.writeFileSync(outputPath, JSON.stringify(lessons, null, 2));
console.log(`Wrote ${outputPath} with ${lessons.length} lessons`);
