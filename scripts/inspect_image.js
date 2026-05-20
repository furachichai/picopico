import { Jimp } from 'jimp';

async function main() {
    try {
        const imgPath = '/Users/gg/.gemini/antigravity/brain/622d2bcf-d59f-405b-9d00-a7573edeef37/media__1779241660107.png';
        const image = await Jimp.read(imgPath);
        console.log(`Image details: width=${image.bitmap.width}, height=${image.bitmap.height}`);
    } catch (e) {
        console.error('Error reading image:', e);
    }
}

main();
