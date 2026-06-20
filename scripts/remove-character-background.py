#!/usr/bin/env python3
"""Remove edge-connected black/white backgrounds from character PNGs."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(r: int, g: int, b: int, a: int, dark: int, light: int) -> bool:
    if a < 8:
        return True
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx <= dark:
        return True
    if r >= light and g >= light and b >= light and (mx - mn) <= 18:
        return True
    return False


def remove_edge_background(image: Image.Image, dark: int = 28, light: int = 238) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        idx = y * width + x
        if visited[idx]:
            return
        r, g, b, a = pixels[x, y]
        if not is_background(r, g, b, a, dark, light):
            return
        visited[idx] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        enqueue(x + 1, y)
        enqueue(x - 1, y)
        enqueue(x, y + 1)
        enqueue(x, y - 1)

    return rgba


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dir",
        default=str(Path(__file__).resolve().parent.parent / "public" / "character"),
    )
    args = parser.parse_args()
    char_dir = Path(args.dir)
    backup_dir = char_dir / "_original"
    backup_dir.mkdir(exist_ok=True)

    files = sorted(
        p
        for p in char_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and not p.name.startswith("_")
    )
    if not files:
        raise SystemExit(f"未找到图片: {char_dir}")

    for path in files:
        backup = backup_dir / path.name
        if not backup.exists():
            backup.write_bytes(path.read_bytes())

        image = Image.open(path)
        result = remove_edge_background(image)
        result.save(path, format="PNG")
        print(f"已去背景: {path.name}")

    print(f"完成。原图备份在: {backup_dir}")


if __name__ == "__main__":
    main()
