from PIL import Image

def recreate_smooth_hd_logo():
    input_path = "merki_logo_transparent.png"
    output_smooth = "merki_logo_2048px_smooth.png"
    
    img = Image.open(input_path).convert("RGBA")
    
    # 2048x2048 作成
    # シャープネスフィルタを一切使わず、Lanczos だけでリサイズ
    # これによりエッジの不自然な強調（白い線の目立ち）を抑えます
    img_2048 = img.resize((2048, 2048), Image.Resampling.LANCZOS)
    
    # 保存（圧縮なしで最高のピクセル精度を維持）
    img_2048.save(output_smooth, "PNG", compress_level=0)
    
    print(f"Re-created smooth high-res version: {output_smooth}")

if __name__ == "__main__":
    recreate_smooth_hd_logo()
