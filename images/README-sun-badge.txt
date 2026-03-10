Badge sun (top-left from suns.eps)
---------------------------------
The hero date badge uses an image for the sun on the left. The repo includes sun-badge.svg (same design as the original inline icon) so the badge works out of the box.

To use your own sun from suns.eps instead:

1. Open suns.eps in Illustrator, Inkscape, or similar.
2. Select/crop just the top-left sun.
3. Export that art as PNG (transparent or copper-tinted) or SVG.
4. Save as images/sun-badge.png (or overwrite images/sun-badge.svg).
5. If you use PNG, change the badge <img> src in index.html to images/sun-badge.png.

If the image fails to load, the page falls back to the inline sun icon automatically.
