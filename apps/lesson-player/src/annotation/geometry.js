export function normalizePoint(clientX, clientY, rect) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  };
}

export function scalePoint(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}
