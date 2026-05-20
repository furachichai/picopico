import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function main() {
    try {
        const imgPath = '/Users/gg/.gemini/antigravity/brain/622d2bcf-d59f-405b-9d00-a7573edeef37/media__1779241660107.png';
        const image = await Jimp.read(imgPath);
        
        const w = image.bitmap.width;
        const h = image.bitmap.height;
        
        const halfH = Math.floor(h / 2);
        
        // Moco (Top half)
        const moco = image.clone().crop({ x: 0, y: 0, w: w, h: halfH });
        // Topo (Bottom half)
        const topo = image.clone().crop({ x: 0, y: halfH, w: w, h: h - halfH });
        
        const outputDir = '/Users/gg/Documents/GitHub/picopico/public/assets';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        await moco.write(path.join(outputDir, 'logo_moco.png'));
        await topo.write(path.join(outputDir, 'logo_topo.png'));
        
        console.log('Successfully cropped and saved logo_moco.png and logo_topo.png');
    } catch (e) {
        console.error('Error cropping image:', e);
    }
}

main();
