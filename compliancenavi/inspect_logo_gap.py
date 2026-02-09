from PIL import Image

def inspect_gap():
    img = Image.open("merki_logo_transparent.png").convert("RGBA")
    w, h = img.size
    
    # 切り込みがあると思われる右上方向（35度〜50度付近）をスキャン
    # 透過度が0（完全透過）なのか、それとも白い色が塗られているのかを確認
    for y in range(h//4, h//2):
        for x in range(w//2, 3*w//4):
            pixel = img.getpixel((x, y))
            if pixel[3] < 255: # 透過部分を見つけた
                print(f"Transparency detected at ({x}, {y}): {pixel}")
                # 最初に見つかった透明領域のピクセルをいくつか表示して終了
                return

if __name__ == "__main__":
    inspect_gap()
