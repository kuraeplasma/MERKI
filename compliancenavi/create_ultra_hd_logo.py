from PIL import Image, ImageDraw
import os

# Create a high-resolution MERKI logo from scratch
# Size: 2048x2048 for ultra-high resolution
size = 2048
output_path = "merki_social_logo_ultra_hd.png"

# Create a new image with transparent background
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Define the circle parameters
center = size // 2
radius = int(size * 0.45)  # 90% of half the size for padding

# Define the purple gradient colors (from lighter to darker)
color_light = (155, 127, 199)  # #9b7fc7
color_dark = (118, 75, 162)    # #764ba2

# Draw the main circle with gradient effect
# We'll simulate gradient by drawing multiple circles with varying colors
for i in range(radius, 0, -1):
    # Calculate the color for this ring (gradient from light to dark)
    ratio = i / radius
    r = int(color_light[0] * ratio + color_dark[0] * (1 - ratio))
    g = int(color_light[1] * ratio + color_dark[1] * (1 - ratio))
    b = int(color_light[2] * ratio + color_dark[2] * (1 - ratio))
    
    # Draw the circle
    bbox = [center - i, center - i, center + i, center + i]
    draw.ellipse(bbox, fill=(r, g, b, 255))

# Draw the white diagonal line (pie chart segment)
# This creates the distinctive MERKI logo look
line_width = int(size * 0.015)  # Thin white line
angle_start = 45  # Start angle in degrees
angle_end = 47    # End angle (very thin slice)

# Draw the white segment line
draw.pieslice(
    [center - radius, center - radius, center + radius, center + radius],
    start=angle_start,
    end=angle_end,
    fill=(255, 255, 255, 255)
)

# Save the ultra-high-resolution version
img.save(output_path, 'PNG', optimize=False, quality=100)
print(f"Ultra-high-resolution logo created: {output_path}")
print(f"Size: {img.size}")
print(f"File size: {os.path.getsize(output_path) / 1024:.2f} KB")
