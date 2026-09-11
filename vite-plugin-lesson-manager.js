import fs from 'fs';
import path from 'path';

export default function lessonManagerPlugin() {
    return {
        name: 'vite-plugin-lesson-manager',
        configureServer(server) {
            server.middlewares.use('/api/save-lesson', async (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });

                    req.on('end', () => {
                        try {
                            const { path: lessonPath, content } = JSON.parse(body);

                            if (!lessonPath || !content) {
                                res.statusCode = 400;
                                res.end(JSON.stringify({ error: 'Missing path or content' }));
                                return;
                            }

                            // Construct absolute path, ensuring it's within the project
                            const fullPath = path.resolve(process.cwd(), lessonPath);

                            // Security check: ensure we are writing inside the project
                            if (!fullPath.startsWith(process.cwd())) {
                                res.statusCode = 403;
                                res.end(JSON.stringify({ error: 'Invalid path' }));
                                return;
                            }

                            const dir = path.dirname(fullPath);

                            // Ensure directory exists
                            if (!fs.existsSync(dir)) {
                                fs.mkdirSync(dir, { recursive: true });
                            }

                            // Write file
                            fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, path: lessonPath }));
                        } catch (error) {
                            console.error('Error saving lesson:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // List all lessons as a flat array sorted by order prefix
            server.middlewares.use('/api/list-lessons', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const lessonsDir = path.resolve(process.cwd(), 'lessons');

                        if (!fs.existsSync(lessonsDir)) {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify([]));
                            return;
                        }

                        const results = [];
                        const folders = fs.readdirSync(lessonsDir).sort((a, b) => {
                            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                        });

                        folders.forEach(folder => {
                            const folderPath = path.join(lessonsDir, folder);
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
                                visible: content.visible !== false, // default true
                                order: order,
                                content: content
                            });
                        });

                        // Sort by order
                        results.sort((a, b) => a.order - b.order);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(results));
                    } catch (error) {
                        console.error('Error listing lessons:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: error.message }));
                    }
                } else {
                    next();
                }
            });

            server.middlewares.use('/api/delete-lesson', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { path: itemPath } = JSON.parse(body);
                            if (!itemPath) throw new Error('Missing path');

                            const fullPath = path.resolve(process.cwd(), itemPath);
                            if (!fullPath.startsWith(process.cwd())) throw new Error('Invalid path');

                            if (fs.existsSync(fullPath)) {
                                const deletedDir = path.resolve(process.cwd(), '.deleted_lessons');
                                if (!fs.existsSync(deletedDir)) {
                                    fs.mkdirSync(deletedDir);
                                }
                                const folderName = path.basename(fullPath);
                                const newFolderName = `${Date.now()}__${folderName}`;
                                const newPath = path.join(deletedDir, newFolderName);
                                fs.renameSync(fullPath, newPath);
                            }

                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true }));
                        } catch (error) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            server.middlewares.use('/api/list-deleted-lessons', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const deletedDir = path.resolve(process.cwd(), '.deleted_lessons');

                        if (!fs.existsSync(deletedDir)) {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify([]));
                            return;
                        }

                        const results = [];
                        const folders = fs.readdirSync(deletedDir);

                        folders.forEach(folder => {
                            const folderPath = path.join(deletedDir, folder);
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

                            // Parse timestamp
                            const match = folder.match(/^(\d+)__(.*)$/);
                            const timestamp = match ? parseInt(match[1], 10) : 0;
                            const originalName = match ? match[2] : folder;

                            results.push({
                                name: folder,
                                originalName: originalName,
                                path: path.relative(process.cwd(), lessonFile),
                                title: content.title || originalName,
                                description: content.description || '',
                                timestamp: timestamp,
                                content: content
                            });
                        });

                        // Sort by timestamp descending
                        results.sort((a, b) => b.timestamp - a.timestamp);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(results));
                    } catch (error) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: error.message }));
                    }
                } else {
                    next();
                }
            });

            server.middlewares.use('/api/recover-lesson', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { folderName } = JSON.parse(body);
                            if (!folderName) throw new Error('Missing folderName');

                            const deletedDir = path.resolve(process.cwd(), '.deleted_lessons');
                            const deletedPath = path.join(deletedDir, folderName);

                            if (!fs.existsSync(deletedPath)) {
                                throw new Error('Lesson not found in deleted lessons');
                            }

                            const lessonsDir = path.resolve(process.cwd(), 'lessons');
                            if (!fs.existsSync(lessonsDir)) {
                                fs.mkdirSync(lessonsDir);
                            }

                            const match = folderName.match(/^(\d+)__(.*)$/);
                            let originalName = match ? match[2] : folderName;
                            
                            let targetPath = path.join(lessonsDir, originalName);
                            let counter = 1;
                            while (fs.existsSync(targetPath)) {
                                targetPath = path.join(lessonsDir, `${originalName}_recovered_${counter}`);
                                counter++;
                            }

                            fs.renameSync(deletedPath, targetPath);

                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true, newPath: path.relative(process.cwd(), path.join(targetPath, 'lesson.json')) }));
                        } catch (error) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            server.middlewares.use('/api/move-lesson', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { oldPath, newPath } = JSON.parse(body);
                            if (!oldPath || !newPath) throw new Error('Missing paths');

                            const fullOldPath = path.resolve(process.cwd(), oldPath);
                            const fullNewPath = path.resolve(process.cwd(), newPath);

                            if (!fullOldPath.startsWith(process.cwd()) || !fullNewPath.startsWith(process.cwd())) {
                                throw new Error('Invalid path');
                            }

                            if (fs.existsSync(fullOldPath)) {
                                const newDir = path.dirname(fullNewPath);
                                if (!fs.existsSync(newDir)) {
                                    fs.mkdirSync(newDir, { recursive: true });
                                }
                                fs.renameSync(fullOldPath, fullNewPath);
                            }

                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true }));
                        } catch (error) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // Reorder lessons by assigning them new sequential prefixes based on the provided array
            server.middlewares.use('/api/reorder-lessons', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { orderedFolders } = JSON.parse(body);
                            if (!orderedFolders || !Array.isArray(orderedFolders)) throw new Error('Missing orderedFolders');

                            const lessonsDir = path.resolve(process.cwd(), 'lessons');

                            const tempNames = orderedFolders.map((folder, index) => {
                                const oldPath = path.join(lessonsDir, folder);
                                if (!fs.existsSync(oldPath)) throw new Error(`Folder not found: ${folder}`);
                                
                                const match = folder.match(/^(\d+)-(.*)$/);
                                const baseName = match ? match[2] : folder;
                                
                                const newPrefix = String(index + 1).padStart(2, '0');
                                const newName = `${newPrefix}-${baseName}`;
                                const tempName = `TEMP-${Date.now()}-${newName}`;
                                
                                return { oldPath, tempPath: path.join(lessonsDir, tempName), finalPath: path.join(lessonsDir, newName) };
                            });

                            // Rename to temp
                            tempNames.forEach(t => fs.renameSync(t.oldPath, t.tempPath));
                            // Rename to final
                            tempNames.forEach(t => fs.renameSync(t.tempPath, t.finalPath));

                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true }));
                        } catch (error) {
                            console.error('Reorder error:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            server.middlewares.use('/api/load-lesson', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const itemPath = url.searchParams.get('path');

                        if (!itemPath) throw new Error('Missing path');

                        const fullPath = path.resolve(process.cwd(), itemPath);
                        if (!fullPath.startsWith(process.cwd())) throw new Error('Invalid path');

                        if (!fs.existsSync(fullPath)) {
                            res.statusCode = 404;
                            res.end(JSON.stringify({ error: 'File not found' }));
                            return;
                        }

                        const content = fs.readFileSync(fullPath, 'utf-8');
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(content);
                    } catch (error) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: error.message }));
                    }
                } else {
                    next();
                }
            });

            // --- ASSET MANAGEMENT ENDPOINTS ---

            // Upload / Save asset to src/assets/{category}/{filename}
            server.middlewares.use('/api/assets/upload', async (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { dataUrl, base64, filename, category = 'images', overwrite = false } = JSON.parse(body);

                            if ((!dataUrl && !base64) || !filename) {
                                res.statusCode = 400;
                                res.end(JSON.stringify({ error: 'Missing image data or filename' }));
                                return;
                            }

                            // Allowed top-level categories under src/assets
                            const safeCategories = ['characters', 'objects', 'backgrounds', 'images', 'graphics', 'pizza_flavors'];
                            const targetCategory = safeCategories.includes(category) ? category : 'images';

                            // Clean and sanitize filename
                            let cleanName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
                            if (!path.extname(cleanName)) {
                                cleanName += '.png';
                            }

                            const assetsDir = path.resolve(process.cwd(), 'src/assets', targetCategory);
                            if (!fs.existsSync(assetsDir)) {
                                fs.mkdirSync(assetsDir, { recursive: true });
                            }

                            let targetPath = path.join(assetsDir, cleanName);

                            // If not overwriting and file exists, find unique name
                            if (!overwrite && fs.existsSync(targetPath)) {
                                const ext = path.extname(cleanName);
                                const nameWithoutExt = path.basename(cleanName, ext);
                                let counter = 1;
                                while (fs.existsSync(path.join(assetsDir, `${nameWithoutExt}_${counter}${ext}`))) {
                                    counter++;
                                }
                                cleanName = `${nameWithoutExt}_${counter}${ext}`;
                                targetPath = path.join(assetsDir, cleanName);
                            }

                            // Extract base64 content
                            const rawData = base64 || dataUrl.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
                            const buffer = Buffer.from(rawData, 'base64');

                            fs.writeFileSync(targetPath, buffer);

                            // Also copy to public/assets/ so the Sticker's
                            // replaceAll('/src/assets/', '/assets/') resolves correctly
                            const publicAssetsDir = path.resolve(process.cwd(), 'public/assets', targetCategory);
                            if (!fs.existsSync(publicAssetsDir)) {
                                fs.mkdirSync(publicAssetsDir, { recursive: true });
                            }
                            const publicTargetPath = path.join(publicAssetsDir, cleanName);
                            fs.writeFileSync(publicTargetPath, buffer);

                            const relativeSrcPath = `src/assets/${targetCategory}/${cleanName}`;
                            const viteAssetUrl = `/src/assets/${targetCategory}/${cleanName}`;

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                filename: cleanName,
                                category: targetCategory,
                                path: relativeSrcPath,
                                url: viteAssetUrl,
                                size: buffer.length
                            }));
                        } catch (error) {
                            console.error('Error uploading asset:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // List all disk assets across src/assets and public/assets
            server.middlewares.use('/api/assets/list', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const categories = ['characters', 'objects', 'backgrounds', 'images', 'graphics', 'pizza_flavors'];
                        const imageExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp']);
                        const results = {
                            characters: [],
                            objects: [],
                            backgrounds: [],
                            images: [],
                            graphics: [],
                            allImages: [],
                            allBackgrounds: [],
                            allObjects: []
                        };
                        const seenFilenames = new Set();

                        const scanDir = (dirPath, category, urlPrefix, relSubDir = '') => {
                            if (!fs.existsSync(dirPath)) return;
                            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                            for (const entry of entries) {
                                if (entry.isDirectory()) {
                                    scanDir(path.join(dirPath, entry.name), category, urlPrefix, relSubDir ? `${relSubDir}/${entry.name}` : entry.name);
                                } else if (entry.isFile()) {
                                    const ext = path.extname(entry.name).toLowerCase();
                                    if (imageExts.has(ext)) {
                                        const relPath = relSubDir ? `${relSubDir}/${entry.name}` : entry.name;
                                        const key = `${category}:${relPath}`;
                                        if (!seenFilenames.has(key)) {
                                            seenFilenames.add(key);
                                            const assetUrl = `${urlPrefix}/${category}/${relPath}`;
                                            if (results[category]) {
                                                results[category].push(assetUrl);
                                            }
                                            if (category === 'backgrounds') {
                                                results.allBackgrounds.push(assetUrl);
                                            } else if (category === 'objects') {
                                                results.allObjects.push(assetUrl);
                                                results.allImages.push(assetUrl);
                                            } else {
                                                results.allImages.push(assetUrl);
                                            }
                                        }
                                    }
                                }
                            }
                        };

                        // 1. Scan src/assets/
                        for (const cat of categories) {
                            const dir = path.resolve(process.cwd(), 'src/assets', cat);
                            scanDir(dir, cat, '/src/assets');
                        }

                        // 2. Scan public/assets/
                        for (const cat of categories) {
                            const dir = path.resolve(process.cwd(), 'public/assets', cat);
                            scanDir(dir, cat, '/assets');
                        }

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, assets: results }));
                    } catch (error) {
                        console.error('Error listing assets:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: error.message }));
                    }
                } else {
                    next();
                }
            });

            // Get asset info (size, dimensions, full/relative path)
            server.middlewares.use('/api/assets/info', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        let assetPath = url.searchParams.get('path') || url.searchParams.get('url');

                        if (!assetPath) throw new Error('Missing path parameter');

                        // Normalize leading slashes and Vite dev prefixes
                        if (assetPath.startsWith('/src/')) {
                            assetPath = assetPath.slice(1);
                        } else if (assetPath.startsWith('/')) {
                            assetPath = assetPath.slice(1);
                        }

                        let fullPath = path.resolve(process.cwd(), assetPath);
                        if (!fs.existsSync(fullPath)) {
                            // Try resolving inside src/ or public/
                            const trySrc = path.resolve(process.cwd(), 'src', assetPath);
                            const tryPublic = path.resolve(process.cwd(), 'public', assetPath);
                            if (fs.existsSync(trySrc)) fullPath = trySrc;
                            else if (fs.existsSync(tryPublic)) fullPath = tryPublic;
                        }

                        if (!fullPath.startsWith(process.cwd()) || !fs.existsSync(fullPath)) {
                            res.statusCode = 404;
                            res.end(JSON.stringify({ error: 'Asset not found on disk' }));
                            return;
                        }

                        const stat = fs.statSync(fullPath);
                        const relPath = path.relative(process.cwd(), fullPath);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: true,
                            filename: path.basename(fullPath),
                            path: relPath,
                            fullPath: fullPath,
                            size: stat.size,
                            mtime: stat.mtime,
                            birthtime: stat.birthtime
                        }));
                    } catch (error) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: error.message }));
                    }
                } else {
                    next();
                }
            });

            // Delete asset (safely move to .deleted_assets/)
            server.middlewares.use('/api/assets/delete', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { path: assetPath, url: assetUrl } = JSON.parse(body);
                            let target = assetPath || assetUrl;

                            if (!target) throw new Error('Missing path or url');

                            if (target.startsWith('/src/')) {
                                target = target.slice(1);
                            } else if (target.startsWith('/')) {
                                target = target.slice(1);
                            }

                            let fullPath = path.resolve(process.cwd(), target);
                            if (!fs.existsSync(fullPath)) {
                                const trySrc = path.resolve(process.cwd(), 'src', target);
                                const tryPublic = path.resolve(process.cwd(), 'public', target);
                                if (fs.existsSync(trySrc)) fullPath = trySrc;
                                else if (fs.existsSync(tryPublic)) fullPath = tryPublic;
                            }

                            if (!fullPath.startsWith(process.cwd()) || !fs.existsSync(fullPath)) {
                                res.statusCode = 404;
                                res.end(JSON.stringify({ error: 'Asset file not found' }));
                                return;
                            }

                            const deletedDir = path.resolve(process.cwd(), '.deleted_assets');
                            if (!fs.existsSync(deletedDir)) {
                                fs.mkdirSync(deletedDir, { recursive: true });
                            }

                            const filename = path.basename(fullPath);
                            const relToSrc = path.relative(path.resolve(process.cwd(), 'src/assets'), fullPath);
                            const relParts = relToSrc && !relToSrc.startsWith('..') ? relToSrc.split(path.sep) : [];
                            const category = relParts.length > 1 ? relParts[0] : 'images';

                            const newFilename = `${Date.now()}__${category}__${filename}`;
                            const backupPath = path.join(deletedDir, newFilename);

                            fs.renameSync(fullPath, backupPath);

                            // Also remove from public/assets/ if it exists there
                            if (relToSrc && !relToSrc.startsWith('..')) {
                                const publicCopy = path.resolve(process.cwd(), 'public/assets', relToSrc);
                                if (fs.existsSync(publicCopy)) {
                                    try { fs.unlinkSync(publicCopy); } catch { /* ignore */ }
                                }
                            }

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                deleted: path.relative(process.cwd(), fullPath),
                                backup: path.relative(process.cwd(), backupPath)
                            }));
                        } catch (error) {
                            console.error('Error deleting asset:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // Stream raw image from .deleted_assets/ for previewing
            server.middlewares.use('/api/assets/trash/raw', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const urlObj = new URL(req.url, 'http://localhost');
                        const file = urlObj.searchParams.get('file');
                        if (!file) {
                            res.statusCode = 400;
                            res.end('Missing file query param');
                            return;
                        }

                        // Prevent path traversal
                        const safeFileName = path.basename(file);
                        const filePath = path.resolve(process.cwd(), '.deleted_assets', safeFileName);

                        if (!filePath.startsWith(path.resolve(process.cwd(), '.deleted_assets')) || !fs.existsSync(filePath)) {
                            res.statusCode = 404;
                            res.end('File not found in trash');
                            return;
                        }

                        const ext = path.extname(safeFileName).toLowerCase();
                        const mimeMap = {
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.webp': 'image/webp',
                            '.svg': 'image/svg+xml',
                            '.gif': 'image/gif'
                        };
                        const contentType = mimeMap[ext] || 'application/octet-stream';

                        res.statusCode = 200;
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        fs.createReadStream(filePath).pipe(res);
                    } catch (err) {
                        res.statusCode = 500;
                        res.end('Error reading trash file: ' + err.message);
                    }
                } else {
                    next();
                }
            });

            // List deleted assets in .deleted_assets/
            server.middlewares.use('/api/assets/trash', (req, res, next) => {
                if (req.method === 'GET') {
                    try {
                        const deletedDir = path.resolve(process.cwd(), '.deleted_assets');
                        if (!fs.existsSync(deletedDir)) {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, files: [] }));
                            return;
                        }

                        const entries = fs.readdirSync(deletedDir, { withFileTypes: true });
                        const files = entries
                            .filter(e => e.isFile() && !e.name.startsWith('.'))
                            .map(e => {
                                const fullPath = path.join(deletedDir, e.name);
                                const stat = fs.statSync(fullPath);

                                const parts = e.name.split('__');
                                const safeCategories = ['characters', 'objects', 'backgrounds', 'images', 'graphics', 'pizza_flavors'];
                                let timestamp = stat.mtimeMs || Date.now();
                                let category = 'images';
                                let originalFilename = e.name;

                                if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
                                    timestamp = parseInt(parts[0], 10) || timestamp;
                                    if (parts.length >= 3 && safeCategories.includes(parts[1])) {
                                        category = parts[1];
                                        originalFilename = parts.slice(2).join('__');
                                    } else {
                                        originalFilename = parts.slice(1).join('__');
                                        const fname = originalFilename.toLowerCase();
                                        if (fname.startsWith('chef_') || fname.startsWith('pesto_') || fname.startsWith('sales_') || fname.startsWith('dilla_') || fname.startsWith('wizard_') || fname.startsWith('yara_') || fname.includes('chef') || fname.includes('pesto') || fname.includes('wizard') || fname.includes('dilla') || fname.includes('sales')) {
                                            category = 'characters';
                                        } else if (fname.startsWith('whole_') || fname.startsWith('part_') || fname.startsWith('item_') || fname.startsWith('pizza_') || fname.includes('bowl') || fname.includes('counter')) {
                                            category = 'objects';
                                        } else if (fname.startsWith('bkg_') || fname.includes('background')) {
                                            category = 'backgrounds';
                                        }
                                    }
                                }

                                return {
                                    trashFilename: e.name,
                                    originalFilename,
                                    category,
                                    timestamp,
                                    size: stat.size,
                                    previewUrl: `/api/assets/trash/raw?file=${encodeURIComponent(e.name)}`
                                };
                            })
                            .sort((a, b) => b.timestamp - a.timestamp);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, files }));
                    } catch (err) {
                        console.error('Error listing trash:', err);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err.message }));
                    }
                } else {
                    next();
                }
            });

            // Restore asset from .deleted_assets/
            server.middlewares.use('/api/assets/restore', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { trashFilename, targetCategory, targetFilename } = JSON.parse(body);
                            if (!trashFilename) throw new Error('Missing trashFilename');

                            const safeTrashName = path.basename(trashFilename);
                            const sourcePath = path.resolve(process.cwd(), '.deleted_assets', safeTrashName);

                            if (!fs.existsSync(sourcePath)) {
                                res.statusCode = 404;
                                res.end(JSON.stringify({ error: 'Trash file not found' }));
                                return;
                            }

                            // Determine target category and clean name
                            const safeCategories = ['characters', 'objects', 'backgrounds', 'images', 'graphics', 'pizza_flavors'];
                            const finalCat = safeCategories.includes(targetCategory) ? targetCategory : 'characters';

                            let finalName = targetFilename ? path.basename(targetFilename) : safeTrashName;
                            // Clean auto-generated trash prefix if needed
                            const parts = finalName.split('__');
                            if (parts.length >= 3 && /^\d+$/.test(parts[0]) && safeCategories.includes(parts[1])) {
                                finalName = parts.slice(2).join('__');
                            } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
                                finalName = parts.slice(1).join('__');
                            }

                            const srcAssetsDir = path.resolve(process.cwd(), 'src/assets', finalCat);
                            const publicAssetsDir = path.resolve(process.cwd(), 'public/assets', finalCat);

                            if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });
                            if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });

                            let targetSrcPath = path.join(srcAssetsDir, finalName);
                            // Avoid overwriting existing file
                            if (fs.existsSync(targetSrcPath)) {
                                const ext = path.extname(finalName);
                                const base = path.basename(finalName, ext);
                                let counter = 1;
                                while (fs.existsSync(path.join(srcAssetsDir, `${base}_${counter}${ext}`))) {
                                    counter++;
                                }
                                finalName = `${base}_${counter}${ext}`;
                                targetSrcPath = path.join(srcAssetsDir, finalName);
                            }

                            const targetPublicPath = path.join(publicAssetsDir, finalName);

                            // Copy file buffer to both src/ and public/, then remove from trash
                            const fileBuffer = fs.readFileSync(sourcePath);
                            fs.writeFileSync(targetSrcPath, fileBuffer);
                            fs.writeFileSync(targetPublicPath, fileBuffer);
                            fs.unlinkSync(sourcePath);

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                filename: finalName,
                                category: finalCat,
                                restoredPath: `src/assets/${finalCat}/${finalName}`,
                                restoredUrl: `/src/assets/${finalCat}/${finalName}`
                            }));
                        } catch (err) {
                            console.error('Error restoring asset:', err);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // Permanently delete asset from trash
            server.middlewares.use('/api/assets/trash/delete', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { trashFilename, all } = JSON.parse(body);
                            const deletedDir = path.resolve(process.cwd(), '.deleted_assets');

                            if (!fs.existsSync(deletedDir)) {
                                res.statusCode = 200;
                                res.end(JSON.stringify({ success: true }));
                                return;
                            }

                            if (all) {
                                const entries = fs.readdirSync(deletedDir);
                                for (const e of entries) {
                                    if (!e.startsWith('.')) {
                                        try { fs.unlinkSync(path.join(deletedDir, e)); } catch {}
                                    }
                                }
                            } else if (trashFilename) {
                                const safeName = path.basename(trashFilename);
                                const target = path.join(deletedDir, safeName);
                                if (fs.existsSync(target)) {
                                    fs.unlinkSync(target);
                                }
                            }

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err) {
                            console.error('Error deleting from trash:', err);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                } else {
                    next();
                }
            });

            // Update asset category / Rename
            server.middlewares.use('/api/assets/update-category', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { path: assetPath, newCategory, newFilename } = JSON.parse(body);
                            if (!assetPath) throw new Error('Missing asset path');

                            let target = assetPath;
                            if (target.startsWith('/src/')) target = target.slice(1);
                            else if (target.startsWith('/')) target = target.slice(1);

                            let fullPath = path.resolve(process.cwd(), target);
                            if (!fs.existsSync(fullPath)) {
                                const trySrc = path.resolve(process.cwd(), 'src', target);
                                if (fs.existsSync(trySrc)) fullPath = trySrc;
                            }

                            if (!fullPath.startsWith(process.cwd()) || !fs.existsSync(fullPath)) {
                                res.statusCode = 404;
                                res.end(JSON.stringify({ error: 'Asset file not found' }));
                                return;
                            }

                            const safeCategories = ['characters', 'objects', 'backgrounds', 'images', 'graphics', 'pizza_flavors'];
                            const finalCat = safeCategories.includes(newCategory) ? newCategory : 'images';
                            const targetDir = path.resolve(process.cwd(), 'src/assets', finalCat);
                            if (!fs.existsSync(targetDir)) {
                                fs.mkdirSync(targetDir, { recursive: true });
                            }

                            const finalName = newFilename ? path.basename(newFilename) : path.basename(fullPath);
                            const newFullPath = path.join(targetDir, finalName);

                            fs.renameSync(fullPath, newFullPath);

                            // Also move in public/assets/ if it exists there
                            const relToSrcDir = path.relative(path.resolve(process.cwd(), 'src/assets'), fullPath);
                            if (relToSrcDir && !relToSrcDir.startsWith('..')) {
                                const publicOld = path.resolve(process.cwd(), 'public/assets', relToSrcDir);
                                if (fs.existsSync(publicOld)) {
                                    const publicTargetDir = path.resolve(process.cwd(), 'public/assets', finalCat);
                                    if (!fs.existsSync(publicTargetDir)) {
                                        fs.mkdirSync(publicTargetDir, { recursive: true });
                                    }
                                    try { fs.renameSync(publicOld, path.join(publicTargetDir, finalName)); } catch { /* ignore */ }
                                }
                            }

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                newPath: `src/assets/${finalCat}/${finalName}`,
                                newUrl: `/src/assets/${finalCat}/${finalName}`
                            }));
                        } catch (error) {
                            console.error('Error updating asset category:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: error.message }));
                        }
                    });
                } else {
                    next();
                }
            });
        },
    };
}
