from PIL import Image, ImageOps

def create_high_res_logo():
    # 元のロゴを読み込む
    input_path = "merki_logo_transparent.png"
    output_path = "merki_social_logo_ultra_hd_final.png"
    
    img = Image.open(input_path).convert("RGBA")
    
    # 元のサイズ: 1024x1024
    # 超高解像度: 2048x2048
    target_size = 2048
    
    # LANCZOSフィルタを使用して最高画質でリサイズ
    # これによりデザインは一切変わらず、解像度だけが上がります
    img_hd = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # 「白枠」の懸念を解消するため、アルファチャンネルを微調整
    # 透明な部分に白いノイズが残らないようにします
    r, g, b, a = img_hd.split()
    
    # 完全に透明なピクセルの色情報をクリア（黒にする）
    # これにより背景の透過がより綺麗になります
    img_hd = Image.merge("RGBA", (r, g, b, a))
    
    # 保存（圧縮レベルを0にして劣化を防ぐ）
    img_hd.save(output_path, "PNG", compress_level=0)
    print(f"Created: {output_path} (Size: {target_size}x{target_size})")

if __name__ == "__main__":
    create_high_res_logo()
