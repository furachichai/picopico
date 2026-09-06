/**
 * Resolve a /src/assets/... path so it works in both dev and production.
 *
 * In Vite dev mode, /src/assets/... is served directly from the source tree.
 * In production builds, files live under /assets/... (from public/).
 *
 * Lesson JSON stores paths as "/src/assets/characters/foo.png".
 * This helper ensures the browser always gets a working URL.
 */
export function resolveAssetUrl(url) {
    if (!url) return '';
    if (import.meta.env.DEV) return url;                 // Vite serves /src/assets directly
    return url.replaceAll('/src/assets/', '/assets/');    // prod: map to public/
}
