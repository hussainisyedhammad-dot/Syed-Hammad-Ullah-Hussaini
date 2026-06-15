export type Faction = "USA" | "CHINA" | "GLA";

export interface Point {
  x: number;
  y: number;
}

export type UnitType = 
  // USA
  | "CRUSADER" | "HUMVEE" | "COMANCHE" | "AURORA"
  // CHINA
  | "BATTLEMASTER" | "DRAGON_TANK" | "GATLING_TANK" | "OVERLORD"
  // GLA
  | "SCORPION" | "MARAUDER" | "TECHNICAL" | "QUAD_CANNON"
  // Supply drones/trucks
  | "SUPPLY_TRUCK" | "CHINOOK";

export interface Unit {
  id: string;
  type: UnitType;
  faction: Faction;
  isEnemy: boolean;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  health: number;
  maxHealth: number;
  speed: number;
  range: number;
  damage: number;
  cost: number;
  lastFired: number; // gametime ts
  state: "moving" | "attacking" | "returning" | "harvesting";
  angle: number;
  salvageLevel?: number; // for GLA Marauder
  customId?: string;
}

export type StructureType = 
  | "COMMAND_CENTER"
  | "POWER_PLANT"
  | "SUPPLY_CENTER"
  | "WAR_FACTORY"
  | "DEFENSE_TURRET"
  | "SUPERWEAPON";

export interface Structure {
  id: string;
  type: StructureType;
  faction: Faction;
  isEnemy: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  cost: number;
  energyBonus?: number;
  energyCost?: number;
  hasUpgrade?: boolean;
  isDestroyed?: boolean;
  rebuildTime?: number; // GLA holes
}

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  size: number;
  damage: number;
  splash: boolean;
  isEnemy: boolean;
  type: "bullet" | "shell" | "missile" | "toxic" | "laser" | "flame";
  t: number; // index from 0 to 1
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

export interface ChatMessage {
  id: string;
  sender: "player" | "enemy_general" | "advisor";
  senderName: string;
  text: string;
  timestamp: Date;
  faction: Faction;
}

export interface MatchStats {
  score: number;
  credits: number;
  enemyCredits: number;
  powerUsed: number;
  powerGenerated: number;
  enemyPowerUsed: number;
  enemyPowerGenerated: number;
  superweaponTimer: number; // secs
  enemySuperweaponTimer: number; // secs
  kills: number;
  losses: number;
  gameTime: number; // tick count
}

export interface SuperweaponEffect {
  id: string;
  type: "PARTICLE_BEAM" | "NUCLEAR_STRIKE" | "SCUD_STORM";
  x: number;
  y: number;
  radius: number;
  duration: number; // ticks left
  maxDuration: number;
  isEnemy: boolean;
}
