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

                        const getDirectoryTree = (dir) => {
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
                                    results.push({
                                        name: file,
                                        type: 'file',
                                        path: path.relative(process.cwd(), filePath)
                                    });
                                }
                            });
                            return results;
                        };

                        const tree = getDirectoryTree(lessonsDir);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(tree));
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
