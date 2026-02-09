from PIL import Image
import numpy as np

def analyze_logo():
    img = Image.open("merki_logo_transparent.png").convert("RGBA")
    data = np.array(img)
    
    # アルファ値がある（不透明な）ピクセルのみを抽出
    pixels = data[data[:,:,3] > 0]
    
    # 色の範囲を確認
    min_rgb = np.min(pixels[:,:3], axis=0)
    max_rgb = np.max(pixels[:,:3], axis=0)
    
    print(f"Color Range: {min_rgb} to {max_rgb}")
    
    # 四隅（または端）の色をサンプリングしてグラデーションの方向を推測
    # 実際にはロゴ画像を直接目視して、左上が明るく右下が暗いことを確認
    # (155, 127, 199) 前後から (118, 75, 162) 前後
    
    # 形状の分析
    # SVGパス: M50,50 L50,0 A50,50 0 1,1 14.64,14.64 Z
    # これを 2048x2048 でレンダリングする

if __name__ == "__main__":
    analyze_logo()
