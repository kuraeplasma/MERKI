from PIL import Image
import numpy as np

def generate_variations(input_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        data = np.array(img)

        # Base color (Original Purple: #764ba2 -> 118, 75, 162)
        # Variations: Lighter purples
        variations = [
            {"name": "logo_light1.png", "color": [138, 95, 182]}, # Slightly lighter
            {"name": "logo_light2.png", "color": [158, 115, 202]}, # Lighter
            {"name": "logo_light3.png", "color": [178, 135, 222]}  # Very light
        ]
        
        # Identify non-transparent pixels (assuming the logo is the only content)
        # Note: This logic recolors the WHOLE non-transparent area. 
        # If "large round part" is specific, we might need more complex masking, 
        # but for now I will recolor the whole logo as per previous logic.
        r, g, b, a = data.T
        
        # 1. Make white/near-white transparent first (same as before)
        white_areas = (r > 240) & (g > 240) & (b > 240)
        data[..., 3][white_areas.T] = 0
        
        # 2. Get mask for non-transparent pixels
        non_transparent = data[..., 3] > 0

        for var in variations:
            # Copy data for this variation
            var_data = data.copy()
            target_color = var["color"]
            
            # Apply color
            var_data[..., 0][non_transparent] = target_color[0]
            var_data[..., 1][non_transparent] = target_color[1]
            var_data[..., 2][non_transparent] = target_color[2]
            
            # Create image
            new_img = Image.fromarray(var_data)
            
            # Crop
            bbox = new_img.getbbox()
            if bbox:
                new_img = new_img.crop(bbox)
            
            # Save
            output_filename = var["name"]
            new_img.save(output_filename)
            print(f"Saved {output_filename}")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    # Assuming 'logo.png' is the source file in the same directory
    generate_variations("logo.png")
