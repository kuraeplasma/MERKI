from PIL import Image

def make_transparent(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        # Get the color of the top-left pixel to assume as background
        bg_color = datas[0]
        
        print(f"Top-left pixel color (assumed background): {bg_color}")
        
        # Simple threshold check
        threshold = 200 # treating high values (near white) as background

        for item in datas:
            # Check if the pixel is white-ish (R, G, B all > threshold)
            # Adjust threshold as needed. The purple is around (102, 126, 234) which has B=234 but R=102.
            # So checking if ALL channels are > 200 is safe to target white.
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved transparent image to {output_path}")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    # Ensure invalid characters or paths are handled; using local relative paths
    make_transparent("merki_logo_final.png", "merki_logo_transparent.png")
