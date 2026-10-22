/** Renders a QR matrix (from `uqr` on the server) as crisp, scalable SVG — no innerHTML. */
export function QrCode({ matrix, className, label }: { matrix: boolean[][]; className?: string; label: string }) {
  const size = matrix.length;
  const cells: string[] = [];
  matrix.forEach((row, y) => row.forEach((on, x) => on && cells.push(`M${x} ${y}h1v1h-1z`)));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={cells.join("")} fill="#10241c" />
    </svg>
  );
}
