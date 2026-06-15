export interface Point {
  r: number; // Row index (0-19)
  c: number; // Column index (0-19)
}

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface Level {
  id: string | number;
  name: string;
  description: string;
  obstacles: Point[];
  speed: number; // tick interval in ms
  targetScore: number;
  colorTheme: string; // Tailwinds theme color, e.g. "emerald", "indigo"
}

export interface ChatMessage {
  id: string;
  sender: "player" | "sensei";
  text: string;
  timestamp: Date;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}
