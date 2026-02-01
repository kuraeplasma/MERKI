from PIL import Image
import numpy as np

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        data = np.array(img)

        # 1. Make white background transparent
        # Threshold for "white" (e.g., > 240 in all channels)
        r, g, b, a = data.T
        white_areas = (r > 240) & (g > 240) & (b > 240)
        data[..., 3][white_areas.T] = 0
        
        # 2. Recolor non-transparent pixels to Purple (#764ba2 -> 118, 75, 162)
        # Identify non-transparent pixels
        non_transparent = data[..., 3] > 0
        
        # Apply purple color (keeping the original alpha channel if it varies, or force full opaque?)
        # Let's keep original alpha for anti-aliasing edges, but change RGB
        target_color = [118, 75, 162] # #764ba2
        
        data[..., 0][non_transparent] = target_color[0]
        data[..., 1][non_transparent] = target_color[1]
        data[..., 2][non_transparent] = target_color[2]

        # Create new image from data
        new_img = Image.fromarray(data)

        # 3. Crop to content
        bbox = new_img.getbbox()
        if bbox:
            new_img = new_img.crop(bbox)
            print(f"Cropped to {bbox}")
        else:
            print("Warning: Image seems fully transparent after processing.")

        new_img.save(output_path)
        print(f"Saved processed logo to {output_path}")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    process_logo("logo.png", "logo.png")
