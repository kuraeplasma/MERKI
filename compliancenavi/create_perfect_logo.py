from PIL import Image, ImageDraw
import math

def create_perfect_logo():
    # 1. Colors from original analysis (refined)
    # The original logo uses a gradient. Let's pick colors that match the "feel" exactly.
    # Looking at the original: Top-left is lighter purple, Bottom-right is darker.
    color_start = (102, 126, 234) # Matches --primary-gradient in style.css
    color_end = (118, 75, 162)   # Matches --primary-gradient in style.css
    
    # 2. Render at Super Resolution for perfect anti-aliasing
    final_size = 2048
    super_size = final_size * 4 # 8192x8192
    
    # Create super-res canvas
    img = Image.new('RGBA', (super_size, super_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = super_size // 2
    radius = int(super_size * 0.46)
    
    # 3. Draw accurate gradient circle
    # We draw thousands of single-pixel lines to create a smooth diagonal gradient
    for i in range(super_size * 2):
        ratio = i / (super_size * 2)
        r = int(color_start[0] * (1 - ratio) + color_end[0] * ratio)
        g = int(color_start[1] * (1 - ratio) + color_end[1] * ratio)
        b = int(color_start[2] * (1 - ratio) + color_end[2] * ratio)
        # Diagonal lines
        draw.line([(i, 0), (0, i)], fill=(r, g, b, 255))
        
    # 4. Create Mask for the SVG shape (M50,50 L50,0 A50,50 0 1,1 14.64,14.64 Z)
    # This shape is a circle with a slice missing from 0 degrees (12 o'clock) up to 45 degrees (1:30)
    mask = Image.new('L', (super_size, super_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    
    # Pieslice in PIL: 0 is at 3 o'clock. 
    # 12 o'clock is -90. 1:30 is -45.
    # So we want to fill from -45 degrees all the way round to -90 (315 degrees total)
    bbox = [center - radius, center - radius, center + radius, center + radius]
    mask_draw.pieslice(bbox, start=-45, end=270, fill=255)
    
    # Apply mask
    final_super = Image.new('RGBA', (super_size, super_size), (0, 0, 0, 0))
    final_super.paste(img, (0, 0), mask)
    
    # 5. Down-sample with high-quality filter (Supersampling Anti-Aliasing)
    # This result in extremely smooth edges even at high zoom
    final_logo = final_super.resize((final_size, final_size), Image.Resampling.LANCZOS)
    
    output_path = "merki_logo_perfect_hd.png"
    final_logo.save(output_path, "PNG", compress_level=0)
    print(f"Perfect logo created: {output_path}")

if __name__ == "__main__":
    create_perfect_logo()
