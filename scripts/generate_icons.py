import zlib
import struct
import math
import os

def generate_futuristic_png(size, maskable=False):
    width = size
    height = size
    raw = bytearray()
    
    cx, cy = size / 2.0, size / 2.0
    corner_radius = size * 0.22 if not maskable else size * 0.0 # Full bleed for maskable
    
    for y in range(height):
        raw.append(0) # Filter type 0
        for x in range(width):
            dx = abs(x - cx)
            dy = abs(y - cy)
            
            if not maskable:
                rx = max(0, dx - (size/2 - corner_radius))
                ry = max(0, dy - (size/2 - corner_radius))
                dist_corner = math.sqrt(rx*rx + ry*ry)
                if dist_corner > corner_radius:
                    raw.extend([0, 0, 0, 0])
                    continue

            # Normalized coordinates
            nx = x / float(width)
            ny = y / float(height)
            dist_center = math.sqrt((x - cx)**2 + (y - cy)**2) / (size * 0.5)
            
            # Deep Obsidian & Neon Green/Cyan Cyber Radial Background
            glow = max(0, 1.0 - dist_center * 1.1)
            bg_r = int(2 + 10 * glow)
            bg_g = int(12 + 65 * (glow**1.6))
            bg_b = int(22 + 45 * glow)
            
            # Laser Squircle Outer Border (if not maskable)
            border_glow = 0
            if not maskable:
                rx = max(0, dx - (size/2 - corner_radius))
                ry = max(0, dy - (size/2 - corner_radius))
                dist_corner = math.sqrt(rx*rx + ry*ry)
                border_dist = abs(dist_corner - (corner_radius - size*0.02)) if dist_corner > 0 else abs(max(dx, dy) - (size/2 - size*0.02))
                border_glow = max(0, 1.0 - border_dist / (size * 0.025))
            
            # 3D Cyber Emblem Chat Crest
            scale = 0.82 if maskable else 1.0
            bubble_cx, bubble_cy = cx, cy - size * 0.01 * scale
            bubble_r = size * 0.26 * scale
            dist_bubble = math.sqrt((x - bubble_cx)**2 + (y - bubble_cy)**2)
            
            # Tail
            in_tail = False
            tx = x - (cx - size * 0.18 * scale)
            ty = y - (cy + size * 0.20 * scale)
            if -size*0.10*scale <= tx <= size*0.10*scale and -size*0.10*scale <= ty <= size*0.10*scale:
                if tx + ty < size * 0.07 * scale:
                    in_tail = True
                    
            in_bubble = (dist_bubble <= bubble_r) or in_tail
            
            # Inner D Cut
            d_cx, d_cy = cx - size * 0.03 * scale, cy - size * 0.01 * scale
            dist_d = math.sqrt((x - d_cx)**2 + (y - d_cy)**2)
            in_d_hole = (dist_d <= bubble_r * 0.46) and (x > d_cx)
            
            # Glow Aura around symbol
            bubble_aura = max(0, 1.0 - abs(dist_bubble - bubble_r) / (size * 0.12 * scale))
            
            r, g, b, a = bg_r, bg_g, bg_b, 255
            
            # Neon Green Border
            if border_glow > 0:
                r = int(r * (1 - border_glow) + 0 * border_glow)
                g = int(g * (1 - border_glow) + 255 * border_glow)
                b = int(b * (1 - border_glow) + 140 * border_glow)
                
            # Render Crest with 3D Emerald-Cyan Gradient & Specular Polish
            if in_bubble and not in_d_hole:
                grad_factor = (nx + (1 - ny)) * 0.5
                cr_r = int(0 * (1 - grad_factor) + 0 * grad_factor)
                cr_g = int(255 * (1 - grad_factor) + 230 * grad_factor)
                cr_b = int(128 * (1 - grad_factor) + 255 * grad_factor)
                
                # Specular 3D Glass Light
                specular = max(0, 1.0 - math.sqrt((x - (cx - bubble_r*0.45))**2 + (y - (cy - bubble_r*0.45))**2) / (bubble_r * 0.75))
                cr_r = min(255, int(cr_r + 200 * (specular**2.5)))
                cr_g = min(255, int(cr_g + 120 * (specular**2.5)))
                cr_b = min(255, int(cr_b + 200 * (specular**2.5)))
                
                r, g, b = cr_r, cr_g, cr_b
            elif bubble_aura > 0:
                aura = (bubble_aura ** 2.0) * 0.85
                r = min(255, int(r + 0 * aura))
                g = min(255, int(g + 240 * aura))
                b = min(255, int(b + 180 * aura))

            # Quantum Star Flare
            star_x, star_y = cx + size * 0.22 * scale, cy - size * 0.22 * scale
            star_dist = math.sqrt((x - star_x)**2 + (y - star_y)**2)
            if star_dist < size * 0.08 * scale:
                s_int = (1.0 - star_dist / (size * 0.08 * scale)) ** 0.5
                r = min(255, int(r + 220 * s_int))
                g = min(255, int(g + 255 * s_int))
                b = min(255, int(b + 255 * s_int))

            raw.extend([r, g, b, a])
            
    compressor = zlib.compressobj(level=9)
    compressed = compressor.compress(raw) + compressor.flush()
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

os.makedirs('public', exist_ok=True)

with open('public/icon-192.png', 'wb') as f:
    f.write(generate_futuristic_png(192, maskable=False))

with open('public/icon-512.png', 'wb') as f:
    f.write(generate_futuristic_png(512, maskable=False))

with open('public/icon-maskable.png', 'wb') as f:
    f.write(generate_futuristic_png(512, maskable=True))

print("PNG icons (192x192, 512x512, maskable) created successfully!")
