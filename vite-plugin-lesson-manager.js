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
                                fs.rmSync(fullPath, { recursive: true, force: true });
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

            // Reorder lessons by swapping the order prefixes of two adjacent lessons
            server.middlewares.use('/api/reorder-lessons', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { folderA, folderB } = JSON.parse(body);
                            if (!folderA || !folderB) throw new Error('Missing folder names');

                            const lessonsDir = path.resolve(process.cwd(), 'lessons');
                            const pathA = path.join(lessonsDir, folderA);
                            const pathB = path.join(lessonsDir, folderB);

                            if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
                                throw new Error('Folder not found');
                            }

                            // Parse order prefixes
                            const matchA = folderA.match(/^(\d+)-(.*)$/);
                            const matchB = folderB.match(/^(\d+)-(.*)$/);
                            if (!matchA || !matchB) throw new Error('Invalid folder names');

                            const newFolderA = `${matchB[1]}-${matchA[2]}`;
                            const newFolderB = `${matchA[1]}-${matchB[2]}`;

                            // Use temp name to avoid collision
                            const tempName = `TEMP-${Date.now()}`;
                            const tempPath = path.join(lessonsDir, tempName);

                            fs.renameSync(pathA, tempPath);
                            fs.renameSync(pathB, path.join(lessonsDir, newFolderB));
                            fs.renameSync(tempPath, path.join(lessonsDir, newFolderA));

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
        },
    };
}
