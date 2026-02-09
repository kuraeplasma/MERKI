from PIL import Image, ImageFilter

def finalize_ultra_hd_logo():
    input_path = "merki_logo_transparent.png"
    # 2048px版と4096px版を作成
    output_2048 = "merki_logo_2048px.png"
    output_4096 = "merki_logo_4096px.png"
    
    img = Image.open(input_path).convert("RGBA")
    
    # 2048x2048 作成
    img_2048 = img.resize((2048, 2048), Image.Resampling.LANCZOS)
    # 拡大時のわずかなぼやけを解消するために、ごく微細なアンシャープマスクを適用
    img_2048 = img_2048.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
    img_2048.save(output_2048, "PNG", compress_level=1)
    
    # 4096x4096 作成
    img_4096 = img.resize((4096, 4096), Image.Resampling.LANCZOS)
    img_4096 = img_4096.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
    img_4096.save(output_4096, "PNG", compress_level=1)
    
    print(f"Created high-res versions from original:")
    print(f"- {output_2048}")
    print(f"- {output_4096}")

if __name__ == "__main__":
    finalize_ultra_hd_logo()
