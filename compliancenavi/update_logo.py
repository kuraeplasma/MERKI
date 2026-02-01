import shutil
import os

# Source path (Artifact)
src = r"C:\Users\kurae\.gemini\antigravity\brain\01707ce7-e556-417e-9df2-07c11122922c\logo_final_adjustment_1769222313866.png"

# Destination path (Current directory)
dst = "logo.png"

try:
    shutil.copy2(src, dst)
    print(f"Success: Copied {src} to {dst}")
except Exception as e:
    print(f"Error: {e}")
