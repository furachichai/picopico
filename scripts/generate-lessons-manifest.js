import fs from 'fs';
import path from 'path';

/**
 * Pre-build script to generate a static lessons manifest for Vercel deployment.
 * This bundles all lessons into a single JSON file that can be fetched at runtime.
 * Run this before `vite build`: node scripts/generate-lessons-manifest.js
 */

const lessonsDir = path.resolve(process.cwd(), 'lessons');
const outputPath = path.resolve(process.cwd(), 'public', 'lessons-data.json');

function getDirectoryTree(dir) {
    if (!fs.existsSync(dir)) return [];

    const results = [];
    const list = fs.readdirSync(dir).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results.push({
                name: file,
                type: 'directory',
                path: path.relative(process.cwd(), filePath),
                children: getDirectoryTree(filePath)
            });
        } else if (file.endsWith('.json')) {
            // Read the full lesson content
            let content = {};
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                content = JSON.parse(fileContent);
            } catch (e) {
                console.error(`Error reading ${file}:`, e);
            }

            results.push({
                name: file,
                type: 'file',
                path: path.relative(process.cwd(), filePath),
                title: content.title,
                description: content.description,
                content: content // Embed full lesson content
            });
        }
    });
    return results;
}

console.log('Generating lessons manifest...');
const tree = getDirectoryTree(lessonsDir);
fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));
console.log(`Wrote ${outputPath}`);
