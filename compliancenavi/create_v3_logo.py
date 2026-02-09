from PIL import Image, ImageDraw

def create_ultra_hd_logo_v3():
    size = 2048
    output_path = "merki_social_logo_v3_2048.png"
    
    # 1. グラデーション背景を作成
    # #667eea (102, 126, 234) -> #764ba2 (118, 75, 162)
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gradient = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_grad = ImageDraw.Draw(gradient)
    
    # 135度の対角線グラデーションをシミュレート
    start_color = (102, 126, 234)
    end_color = (118, 75, 162)
    
    for i in range(size * 2):
        ratio = i / (size * 2)
        r = int(start_color[0] * (1 - ratio) + end_color[0] * ratio)
        g = int(start_color[1] * (1 - ratio) + end_color[1] * ratio)
        b = int(start_color[2] * (1 - ratio) + end_color[2] * ratio)
        
        # 斜め線（x + y = i）を描画
        draw_grad.line([(i, 0), (0, i)], fill=(r, g, b, 255))
        
    # 2. マスク（パックマン型）を作成
    mask = Image.new('L', (size, size), 0)
    draw_mask = ImageDraw.Draw(mask)
    
    margin = int(size * 0.05)
    bbox = [margin, margin, size - margin, size - margin]
    
    # SVGパス再現: 12時から時計回りに10:30時まで
    # PIL pieslice: 0度は3時方向、時計回りが正
    # 12時 = -90度 または 270度
    # 10:30時 = -135度 または 225度
    # 開始: 270度、終了: 225度 (長い方を通る)
    # PIL は start < end を想定する場合が多いので、315度分を描画
    draw_mask.pieslice(bbox, start=-90, end=225, fill=255)
    
    # 3. グラデーションにマスクを適用
    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final.paste(gradient, (0, 0), mask)
    
    # 4. 保存
    final.save(output_path, "PNG", compress_level=0)
    print(f"Ultra HD Logo V3 created: {output_path}")

if __name__ == "__main__":
    create_ultra_hd_logo_v3()
