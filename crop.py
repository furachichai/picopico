from PIL import Image
import sys

img = Image.open(sys.argv[1])
w, h = img.size
print(f"Image {w}x{h}")
