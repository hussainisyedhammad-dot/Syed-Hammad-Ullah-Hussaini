import { Point } from "../types";

const GRID_SIZE = 20;

// Helper to check if two points are equal
export function pointsEqual(p1: Point, p2: Point): boolean {
  return p1.r === p2.r && p1.c === p2.c;
}

// Convert point to a string key for Sets
export function pointToKey(p: Point): string {
  return `${p.r},${p.c}`;
}

// Find shortest path using Breadth-First Search (BFS)
export function findShortestPath(
  start: Point,
  end: Point,
  blockedKeys: Set<string>,
  gridSize: number = GRID_SIZE
): Point[] | null {
  if (pointsEqual(start, end)) return [start];

  const queue: { point: Point; path: Point[] }[] = [{ point: start, path: [start] }];
  const visited = new Set<string>();
  visited.add(pointToKey(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { r, c } = current.point;

    // Direct neighbors in order of discovery
    const neighbors: Point[] = [
      { r: r - 1, c }, // UP
      { r: r + 1, c }, // DOWN
      { r, c: c - 1 }, // LEFT
      { r, c: c + 1 }, // RIGHT
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.r >= 0 &&
        neighbor.r < gridSize &&
        neighbor.c >= 0 &&
        neighbor.c < gridSize
      ) {
        const key = pointToKey(neighbor);
        if (pointsEqual(neighbor, end)) {
          return [...current.path, neighbor];
        }

        if (!blockedKeys.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push({ point: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
  }

  return null;
}

// Predict next AI move using smart heuristics (BFS + Hamiltonian boundary chase)
export function getNextAiMove(
  snake: Point[],
  food: Point,
  obstacles: Point[],
  gridSize: number = GRID_SIZE
): Point | null {
  if (snake.length === 0) return null;

  const head = snake[0];
  const tail = snake[snake.length - 1];

  // Blocked cells = obstacles + snake body
  const blockedKeys = new Set<string>();
  obstacles.forEach((obs) => blockedKeys.add(pointToKey(obs)));
  
  // Add body points (excluding tail, since tail moves forward unless we are eating)
  for (let i = 0; i < snake.length - 1; i++) {
    blockedKeys.add(pointToKey(snake[i]));
  }

  // 1. Try to find the shortest path to food
  const pathToFood = findShortestPath(head, food, blockedKeys, gridSize);

  if (pathToFood && pathToFood.length > 1) {
    const nextVirtualHead = pathToFood[1];
    
    // Simulate the state after eating the food
    const virtualSnake = [nextVirtualHead, ...snake.slice(0, -1)];
    const virtualBlockedKeys = new Set<string>();
    obstacles.forEach((obs) => virtualBlockedKeys.add(pointToKey(obs)));
    for (let i = 0; i < virtualSnake.length - 1; i++) {
      virtualBlockedKeys.add(pointToKey(virtualSnake[i]));
    }
    
    const virtualTail = virtualSnake[virtualSnake.length - 1];

    // Check if the simulated snake can still reach its tail (meaning it won't trap itself in a spiral)
    const pathToTailFromVirtualHead = findShortestPath(nextVirtualHead, virtualTail, virtualBlockedKeys, gridSize);

    if (pathToTailFromVirtualHead) {
      return nextVirtualHead;
    }
  }

  // 2. If path to food is blocked or unsafe, follow tail (safely wrap around to stall)
  const pathToTail = findShortestPath(head, tail, blockedKeys, gridSize);
  if (pathToTail && pathToTail.length > 1) {
    return pathToTail[1];
  }

  // 3. Fallback: select any neighbor that doesn't immediately crash, favoring the one with the most surrounding free space
  const neighbors = [
    { r: head.r - 1, c: head.c }, // UP
    { r: head.r + 1, c: head.c }, // DOWN
    { r: head.r, c: head.c - 1 }, // LEFT
    { r: head.r, c: head.c + 1 }, // RIGHT
  ];

  let bestNextMove: Point | null = null;
  let maxOpenAreaScore = -1;

  for (const neighbor of neighbors) {
    if (
      neighbor.r >= 0 &&
      neighbor.r < gridSize &&
      neighbor.c >= 0 &&
      neighbor.c < gridSize
    ) {
      const neighborKey = pointToKey(neighbor);
      if (!blockedKeys.has(neighborKey)) {
        const score = getFreeSpaceNeighborsCount(neighbor, blockedKeys, gridSize);
        if (score > maxOpenAreaScore) {
          maxOpenAreaScore = score;
          bestNextMove = neighbor;
        }
      }
    }
  }

  return bestNextMove;
}

// Get count of surrounding unblocked blocks
function getFreeSpaceNeighborsCount(point: Point, blockedKeys: Set<string>, gridSize: number): number {
  let count = 0;
  const neighbors = [
    { r: point.r - 1, c: point.c },
    { r: point.r + 1, c: point.c },
    { r: point.r, c: point.c - 1 },
    { r: point.r, c: point.c + 1 },
  ];

  for (const n of neighbors) {
    if (n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize) {
      if (!blockedKeys.has(pointToKey(n))) {
        count++;
      }
    }
  }
  return count;
}
