import { getLocalLessons } from './lessonStorage';

/**
 * Static fallback template of the collectible card slide from _collectible_card lesson.
 * Used if offline or if file/API requests fail.
 */
export const FALLBACK_COLLECTIBLE_CARD_SLIDE = {
    background: "url(\"/src/assets/backgrounds/bkg_fluid_005.png\")",
    elements: [
        {
            type: "banner",
            content: "<br> 😅",
            x: 49.72222222222223,
            y: 55.546875,
            width: 53.46758575754757,
            height: 52.07324382096494,
            rotation: 0,
            scale: 1.5981549469140102,
            metadata: {
                width: 51,
                height: 12.5,
                fontFamily: "\"Bangers\", cursive, sans-serif",
                fontSize: 26,
                fontStyle: "normal",
                fontWeight: "normal",
                color: "#00b0ff",
                textAlign: "center",
                backgroundColor: "#f6efdd",
                borderColor: "#000000",
                shadow: "grey",
                hasShadow: true,
                borderRadius: 20,
                skin: "comic",
                showTape: false,
                locked: true
            }
        },
        {
            type: "banner",
            content: "<br>",
            x: 50,
            y: 25.703125,
            width: 51,
            height: 10.165172329982045,
            rotation: 0,
            scale: 1.2715071172585377,
            metadata: {
                width: 51,
                height: 12.5,
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontStyle: "normal",
                fontWeight: "normal",
                color: "#00b0ff",
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderColor: "#000000",
                shadow: "grey",
                hasShadow: true,
                borderRadius: 20,
                skin: "comic",
                showTape: false,
                groupId: "group-1789689818834-nbba7m"
            }
        },
        {
            type: "banner",
            content: "<br>",
            x: 49.98424953884548,
            y: 64.921875,
            width: 51,
            height: 46.293558381838835,
            rotation: 0,
            scale: 1.2715071172585377,
            metadata: {
                width: 51,
                height: 12.5,
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontStyle: "normal",
                fontWeight: "normal",
                color: "#00b0ff",
                textAlign: "center",
                backgroundColor: "#FCE4EC",
                borderColor: "#000000",
                shadow: "grey",
                hasShadow: true,
                borderRadius: 20,
                skin: "comic",
                showTape: false
            }
        },
        {
            type: "text",
            content: "<span style=\"caret-color: rgb(33, 150, 243);\"><font color=\"#2196f3\">x </font>+<font color=\"#2196f3\"> 8 </font>=<font color=\"#2196f3\"> 20</font></span>",
            x: 50,
            y: 25.625,
            width: 26.764489040083262,
            height: 5,
            rotation: 0,
            scale: 2.2037322077703445,
            metadata: {
                textAlign: "center",
                fontFamily: "\"HVD Comic Serif Pro\", sans-serif",
                textTransform: "none",
                fontSize: 14,
                color: "#000000",
                groupId: "group-1789689818834-nbba7m"
            }
        },
        {
            type: "text",
            content: "A <b>variable</b> is a <b>symbol</b>—usually a <b>letter</b>—that stands in for an <b>unknown</b> or <b>changing</b> <b>amount</b>.<br><div><br></div><div><b>Any</b> letter works, though <i>lowercase</i> ‭<b>x</b>‬, ‭<b>y</b>‬, and <b>‭z</b>‬ are the most common.</div>",
            x: 49.98424953884548,
            y: 56.875,
            width: 44.72222222222222,
            height: 5,
            rotation: 0,
            scale: 1.2138676431373434,
            metadata: {
                textAlign: "center",
                fontFamily: "\"Fira Sans\"",
                fontSize: 16,
                textTransform: "none"
            }
        },
        {
            type: "text",
            content: "<font color=\"#ffffff\"><span style=\"caret-color: rgb(255, 255, 255); background-color: rgb(0, 0, 0);\"> VarIABLE </span></font>",
            x: 50,
            y: 14.6875,
            width: 82.5,
            height: 5,
            rotation: 0,
            scale: 1,
            metadata: {
                textAlign: "center",
                fontFamily: "\"Bangers\", cursive, sans-serif",
                textTransform: "uppercase",
                fontSize: 27
            }
        },
        {
            type: "image",
            content: "/src/assets/characters/pesto_bike.png",
            x: 50,
            y: 82.03125,
            width: 40,
            height: 28.73177842565598,
            rotation: 0,
            scale: 0.6585162261681237,
            metadata: {
                width: 40,
                height: 28.73177842565598,
                category: "characters",
                hasShadow: false
            }
        }
    ],
    order: 0,
    guides: {
        horizontal: [],
        vertical: [0]
    },
    cartridge: null,
    backgroundSettings: {}
};

/**
 * Fetches the only slide from the lesson _collectible_card dynamically.
 * Prioritizes dynamic disk fetch so user customizations to _collectible_card are reflected.
 */
export async function fetchCollectibleCardSlide() {
    // 1. Try /api/list-lessons or /lessons-data.json
    try {
        const isDev = import.meta.env.DEV;
        const res = await fetch(isDev ? '/api/list-lessons' : '/lessons-data.json');
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) {
                const match = list.find(item => {
                    const title = (item.title || '').toLowerCase();
                    const name = (item.name || '').toLowerCase();
                    const p = (item.path || '').toLowerCase();
                    return title === '_collectible_card' || name.includes('_collectible_card') || p.includes('_collectible_card');
                });
                if (match) {
                    const slide = match.content?.slides?.[0] || match.slides?.[0];
                    if (slide) return slide;
                    if (match.path) {
                        const loadRes = await fetch(`/api/load-lesson?path=${encodeURIComponent(match.path)}`);
                        if (loadRes.ok) {
                            const data = await loadRes.json();
                            if (data.slides?.[0]) return data.slides[0];
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Error fetching list-lessons for collectible card:', e);
    }

    // 2. Direct load via API endpoint
    try {
        const directRes = await fetch('/api/load-lesson?path=lessons/01-_collectible_card/lesson.json');
        if (directRes.ok) {
            const data = await directRes.json();
            if (data.slides?.[0]) return data.slides[0];
        }
    } catch (e) {
        console.warn('Error direct loading collectible card:', e);
    }

    // 3. Try /lessons-data.json directly
    try {
        const dataRes = await fetch('/lessons-data.json');
        if (dataRes.ok) {
            const list = await dataRes.json();
            if (Array.isArray(list)) {
                const match = list.find(item => {
                    const title = (item.title || '').toLowerCase();
                    const name = (item.name || '').toLowerCase();
                    const p = (item.path || '').toLowerCase();
                    return title === '_collectible_card' || name.includes('_collectible_card') || p.includes('_collectible_card');
                });
                if (match) {
                    const slide = match.content?.slides?.[0] || match.slides?.[0];
                    if (slide) return slide;
                }
            }
        }
    } catch (e) {
        console.warn('Error fetching lessons-data.json for collectible card:', e);
    }

    // 4. Try local storage
    try {
        const localList = getLocalLessons();
        const match = localList.find(item => {
            const title = (item.title || '').toLowerCase();
            const p = (item.path || '').toLowerCase();
            return title === '_collectible_card' || p.includes('_collectible_card');
        });
        if (match?.slides?.[0]) return match.slides[0];
    } catch (e) {
        console.warn('Error checking local lessons for collectible card:', e);
    }

    // 5. Fallback to bundled template
    return FALLBACK_COLLECTIBLE_CARD_SLIDE;
}
