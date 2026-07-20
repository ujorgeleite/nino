// utils/nearestSocket.ts
// Which socket a drop is actually aimed at.
//
// Shared by both games, because both learned the same lesson. A snap radius on
// its own is an absolute number of points, and on a small board — iPhone
// landscape puts the puzzle's sockets about 42pt apart against a 78pt radius —
// the neighbouring sockets fall inside it. A piece dropped squarely on the
// WRONG socket was accepted, and the picture assembled itself wrong while the
// child had done nothing.
//
// Nearest-wins has no dependence on how large the board happens to be.

export type Point = { x: number; y: number };

/**
 * The socket a drop lands closest to, or null if there are none.
 *
 * A piece is placed only when the nearest socket is ITS OWN. Checking only
 * that the drop was within the snap radius of the right socket was not enough:
 * the radius is an absolute number of points, and on iPhone landscape the
 * board is small enough that two sockets sit 42pt apart — well inside a 78pt
 * radius — so a piece dropped squarely on the WRONG socket was accepted, and
 * the picture assembled itself wrong.
 *
 * Nearest-wins has no such dependence on how large the board happens to be.
 */
export function nearestSocket(
  point: Point,
  targets: Record<string, Point>,
): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const [id, target] of Object.entries(targets)) {
    const d = Math.hypot(point.x - target.x, point.y - target.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
}
