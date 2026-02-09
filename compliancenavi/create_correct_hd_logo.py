from PIL import Image

# Load the original MERKI logo
input_path = "merki_logo_transparent.png"
output_path = "merki_social_logo_hd_correct.png"

# Open the image
img = Image.open(input_path)

# Get current size
current_width, current_height = img.size
print(f"Original size: {current_width}x{current_height}")

# The original is already 1024x1024, which is good for social media
# But let's create a 2048x2048 version for ultra-high quality
target_size = 2048

# Resize with LANCZOS (highest quality) resampling
# This preserves the exact design while increasing resolution
img_hd = img.resize((target_size, target_size), Image.Resampling.LANCZOS)

# Save with maximum quality, no optimization to preserve all details
img_hd.save(output_path, 'PNG', optimize=False, compress_level=0)

print(f"High-resolution logo saved: {output_path}")
print(f"New size: {img_hd.size}")

# Also create a standard 1024x1024 version with better quality settings
output_1024 = "merki_social_logo_1024.png"
img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img_1024.save(output_1024, 'PNG', optimize=False, compress_level=0)
print(f"Standard 1024x1024 logo saved: {output_1024}")
