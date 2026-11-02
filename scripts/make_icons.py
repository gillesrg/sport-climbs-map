"""Draw the app icon (crag silhouette + map pin) as PNGs with no dependencies."""
import struct, sys, zlib

BG, ROCK, PIN = (31, 111, 92), (240, 236, 226), (233, 108, 63)
CRAG = [(0.08, 0.86), (0.30, 0.38), (0.40, 0.50), (0.56, 0.22), (0.92, 0.86)]


def inside(px, py, poly):
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


def color(x, y):
    # map pin: circle + point, upper right
    cx, cy, r = 0.70, 0.30, 0.13
    if (x - cx) ** 2 + (y - cy) ** 2 < r * r:
        return BG if (x - cx) ** 2 + (y - cy) ** 2 < (r * .42) ** 2 else PIN
    if inside(x, y, [(cx - r * .8, cy + r * .6), (cx + r * .8, cy + r * .6), (cx, cy + r * 2.3)]):
        return PIN
    return ROCK if inside(x, y, CRAG) else BG


def png(size, path):
    rows = b"".join(b"\x00" + bytes(c for x in range(size) for c in
                                      color((x + .5) / size, (y + .5) / size)) for y in range(size))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    for s in (180, 192, 512):
        png(s, f"{sys.argv[1]}/icon-{s}.png")
