from PIL import Image

def sample_colors():
    img = Image.open("merki_logo_transparent.png").convert("RGBA")
    w, h = img.size
    
    # 左上 (おおよそ不透明な部分の端)
    c1 = img.getpixel((w//4, h//4))
    # 右下 (おおよそ不透明な部分の端)
    c2 = img.getpixel((3*w//4, 3*h//4))
    # 中央
    c3 = img.getpixel((h//2, w//2))
    
    print(f"Top-Left sample: {c1}")
    print(f"Bottom-Right sample: {c2}")
    print(f"Center sample: {c3}")

if __name__ == "__main__":
    sample_colors()
