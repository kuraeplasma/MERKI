from PIL import Image
import os

# Load the existing MERKI logo
input_path = "merki_logo_transparent.png"
output_path = "merki_social_logo_hd.png"

# Open the image
img = Image.open(input_path)

# Get current size
current_width, current_height = img.size
print(f"Current size: {current_width}x{current_height}")

# Target size for social media (1024x1024 for high quality)
target_size = 1024

# Calculate the scaling factor
scale_factor = target_size / max(current_width, current_height)

# Calculate new dimensions
new_width = int(current_width * scale_factor)
new_height = int(current_height * scale_factor)

# Resize with high-quality resampling
img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

# If the image is not square, create a square canvas
if new_width != new_height:
    # Create a new transparent square image
    square_img = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    
    # Calculate position to center the image
    x_offset = (target_size - new_width) // 2
    y_offset = (target_size - new_height) // 2
    
    # Paste the resized image onto the square canvas
    square_img.paste(img_resized, (x_offset, y_offset), img_resized)
    img_resized = square_img

# Save the high-resolution version
img_resized.save(output_path, 'PNG', optimize=True)
print(f"High-resolution logo saved: {output_path}")
print(f"New size: {img_resized.size}")
