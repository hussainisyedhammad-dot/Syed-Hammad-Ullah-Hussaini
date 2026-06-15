import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Faction, 
  Point, 
  Unit, 
  Structure, 
  Projectile, 
  Particle, 
  ChatMessage, 
  SuperweaponEffect, 
  StructureType,
  UnitType
} from "./types";
import SenseiConsole from "./components/SenseiConsole";
import GameSettings from "./components/GameSettings";
import { playSound } from "./utils/sound";
import { 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Zap, 
  Radio, 
  Target, 
  Trophy, 
  Swords, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Bomb
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Faction States
  const [playerFaction, setPlayerFaction] = useState<Faction>("USA");
  const [opponentFaction, setOpponentFaction] = useState<Faction>("GLA");

  // Money & Power Telemetry
  const [credits, setCredits] = useState(9000);
  const [opponentCredits, setOpponentCredits] = useState(9000);
  const [powerGenerated, setPowerGenerated] = useState(150);
  const [powerUsed, setPowerUsed] = useState(0);

  // Stats
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem("ais_generals_highscore")) || 12;
  });
  const [kills, setKills] = useState(0);
  const [losses, setLosses] = useState(0);

  // States
  const [structures, setStructures] = useState<Structure[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [superweapons, setSuperweapons] = useState<SuperweaponEffect[]>([]);
  const [mapTheme, setMapTheme] = useState({
    mapName: "Tournament Desert",
    atmosphere: "Arid ground with active oil geysers and central lanes.",
    terrainTheme: "DESERT",
    primaryColor: "#d97706",
    hazards: [
      { x: 200, y: 120, r: 18, label: "Tech Oil Derrick" },
      { x: 200, y: 280, r: 18, label: "Neutral Bunker" }
    ],
    supplyDocks: [
      { x: 60, y: 80, amount: 20000 },
      { x: 340, y: 320, amount: 20000 }
    ]
  });

  // Timers & Combat Modes
  const [playerSwTimer, setPlayerSwTimer] = useState(180); // 3 minutes start cooldown
  const [enemySwTimer, setEnemySwTimer] = useState(240);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Build / Superweapons modes
  const [activeBuilding, setActiveBuilding] = useState<StructureType | null>(null);
  const [isSellMode, setIsSellMode] = useState(false);
  const [isSwTargeting, setIsSwTargeting] = useState(false);

  // Radio Chat Log
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isGeneratingSkirmish, setIsGeneratingSkirmish] = useState(false);

  // Ref loops
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Sound helper that honors setting
  const playSfx = useCallback((type: any) => {
    if (soundEnabled) {
      playSound(type);
    }
  }, [soundEnabled]);

  // Radio Commentary request with AI General
  const fetchGeneralCommentary = async (event: string, textQuestion?: string) => {
    setIsLoadingChat(true);
    try {
      const resp = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerFaction,
          opponentFaction,
          credits,
          kills,
          losses,
          event,
          chatQuestion: textQuestion,
        })
      });
      const data = await resp.json();
      if (data.commentary) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            sender: "enemy_general",
            senderName: `AI GENERAL (${opponentFaction})`,
            text: data.commentary,
            timestamp: new Date(),
            faction: opponentFaction
          }
        ]);
        playSfx("alarm");
      }
    } catch (err) {
      console.warn("Comm server slowness.");
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Generate dynamic custom maps via AI
  const handleGenerateCustomSkirmish = async (prompt: string) => {
    setIsGeneratingSkirmish(true);
    try {
      const resp = await fetch("/api/generate-skirmish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const mapData = await resp.json();
      if (mapData.mapName) {
        // Adjust coordinates from 0-100 values to our canvas 400x400 range
        const adjustedHazards = (mapData.hazards || []).map((h: any) => ({
          x: Math.max(30, Math.min(370, Math.round((h.x / 100) * 400))),
          y: Math.max(30, Math.min(370, Math.round((h.y / 100) * 400))),
          r: Math.max(10, Math.min(25, h.r)),
          label: h.label
        }));

        const adjustedDocks = (mapData.supplyDocks || []).map((d: any) => ({
          x: Math.max(40, Math.min(360, Math.round((d.x / 100) * 400))),
          y: Math.max(40, Math.min(360, Math.round((d.y / 100) * 400))),
          amount: d.amount || 10000
        }));

        setMapTheme({
          mapName: mapData.mapName,
          atmosphere: mapData.atmosphere || "Hostile procedural theater.",
          terrainTheme: mapData.terrainTheme || "DESERT",
          primaryColor: mapData.primaryColor || "#d97706",
          hazards: adjustedHazards,
          supplyDocks: adjustedDocks
        });

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "advisor",
            senderName: "TACTICAL HQ ADVISOR",
            text: `Skirmish map generated! Objective: Deploy "${mapData.mapName}". Prepare secondary structures. Sector brief: ${mapData.atmosphere}`,
            timestamp: new Date(),
            faction: playerFaction
          }
        ]);
        playSfx("build");
        resetSkirmishGame(playerFaction, opponentFaction, {
          mapName: mapData.mapName,
          atmosphere: mapData.atmosphere,
          terrainTheme: mapData.terrainTheme,
          primaryColor: mapData.primaryColor,
          hazards: adjustedHazards,
          supplyDocks: adjustedDocks
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSkirmish(false);
    }
  };

  // Chat message from manual submission box
  const handleUserQuestion = async (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "player",
        senderName: "PLAYER COMMANDER",
        text,
        timestamp: new Date(),
        faction: playerFaction
      }
    ]);
    playSfx("click");
    fetchGeneralCommentary("chat", text);
  };

  // Build/Rebuild starting structures
  const resetSkirmishGame = (
    playerF: Faction, 
    opponentF: Faction, 
    customTheme?: typeof mapTheme
  ) => {
    const themeToUse = customTheme || mapTheme;
    setIsGameOver(false);
    setIsWon(false);
    setCredits(9000);
    setOpponentCredits(9000);
    setKills(0);
    setLosses(0);
    setPlayerSwTimer(180);
    setEnemySwTimer(240);

    // Initial base placement: left side for Player, right side for Opponent
    const initialStructures: Structure[] = [
      // Player Command center
      {
        id: "p_cc",
        type: "COMMAND_CENTER",
        faction: playerF,
        isEnemy: false,
        x: 45,
        y: 200,
        width: 32,
        height: 32,
        health: 4000,
        maxHealth: 4000,
        cost: 3000
      },
      // Player initial Power Plant
      {
        id: "p_pp",
        type: "POWER_PLANT",
        faction: playerF,
        isEnemy: false,
        x: 45,
        y: 80,
        width: 25,
        height: 25,
        health: 1200,
        maxHealth: 1200,
        cost: 800,
        energyBonus: 70
      },
      // Enemy Command Center
      {
        id: "e_cc",
        type: "COMMAND_CENTER",
        faction: opponentF,
        isEnemy: true,
        x: 355,
        y: 200,
        width: 32,
        height: 32,
        health: 4000,
        maxHealth: 4000,
        cost: 3000
      },
      // Enemy initial Power / defense setup
      {
        id: "e_pp",
        type: "POWER_PLANT",
        faction: opponentF,
        isEnemy: true,
        x: 355,
        y: 80,
        width: 25,
        height: 25,
        health: 1200,
        maxHealth: 1200,
        cost: 800,
        energyBonus: 70
      },
      {
        id: "e_turr",
        type: "DEFENSE_TURRET",
        faction: opponentF,
        isEnemy: true,
        x: 295,
        y: 120,
        width: 20,
        height: 20,
        health: 1500,
        maxHealth: 1500,
        cost: 1000
      }
    ];

    setStructures(initialStructures);
    setUnits([]);
    setProjectiles([]);
    setSuperweapons([]);
    particlesRef.current = [];

    // Trigger opening quote radio line
    fetchGeneralCommentary("start");
  };

  // Trigger switch of faction
  const handleFactionChange = (fac: Faction) => {
    setPlayerFaction(fac);
    playSfx("click");
    resetSkirmishGame(fac, opponentFaction);
  };

  const handleOpponentFactionChange = (fac: Faction) => {
    setOpponentFaction(fac);
    playSfx("click");
    resetSkirmishGame(playerFaction, fac);
  };

  // Trigger sell site mode
  const triggerSellMode = () => {
    playSfx("click");
    setIsSellMode(!isSellMode);
    setActiveBuilding(null);
  };

  // Construct a player structure at canvas target coordinate position
  const handlePlaceStructure = (mx: number, my: number) => {
    if (!activeBuilding) return;

    // Pricing checking
    const costMap: Record<StructureType, number> = {
      COMMAND_CENTER: 3000,
      POWER_PLANT: 800,
      SUPPLY_CENTER: 1500,
      WAR_FACTORY: 2000,
      DEFENSE_TURRET: 1000,
      SUPERWEAPON: 5000
    };

    const cost = costMap[activeBuilding] || 1000;
    if (credits < cost) return;

    const baseWidth = activeBuilding === "POWER_PLANT" ? 24 : activeBuilding === "SUPERWEAPON" ? 30 : 25;

    const newStruct: Structure = {
      id: "p_" + activeBuilding + "_" + Date.now(),
      type: activeBuilding,
      faction: playerFaction,
      isEnemy: false,
      x: mx,
      y: my,
      width: baseWidth,
      height: baseWidth,
      health: activeBuilding === "SUPERWEAPON" ? 3000 : 1500,
      maxHealth: activeBuilding === "SUPERWEAPON" ? 3000 : 1500,
      cost,
      energyBonus: activeBuilding === "POWER_PLANT" ? 70 : 0,
      energyCost: activeBuilding === "POWER_PLANT" ? 0 : 25
    };

    setCredits((prev) => prev - cost);
    setStructures((prev) => [...prev, newStruct]);
    setActiveBuilding(null);
    playSfx("build");

    // Spawn harvesters automatically on completing Supply Center
    if (activeBuilding === "SUPPLY_CENTER") {
      const harvesterType = playerFaction === "USA" ? "CHINOOK" : "SUPPLY_TRUCK";
      spawnUnitInstance(harvesterType, mx, my, false);
    }

    // Trigger prompt message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "advisor",
        senderName: "HQ ADVISOR",
        text: `Constructing ${activeBuilding} completed at coordinates: [X: ${mx}, Y: ${my}]. Build grid synchronized!`,
        timestamp: new Date(),
        faction: playerFaction
      }
    ]);
  };

  // Spawn an active player unit based on selected weaponry
  const spawnUnit = (unitId: string) => {
    const costMap: Record<string, number> = {
      // USA
      CRUSADER: 900, HUMVEE: 700, COMANCHE: 1200, AURORA: 2000,
      // China
      BATTLEMASTER: 800, DRAGON_TANK: 800, GATLING_TANK: 900, OVERLORD: 2000,
      // GLA
      SCORPION: 700, MARAUDER: 900, TECHNICAL: 500, QUAD_CANNON: 850
    };

    const cost = costMap[unitId] || 800;
    if (credits < cost) return;

    // Deduct cost and find starting player construction structure
    const factory = structures.find(s => !s.isEnemy && s.type === "WAR_FACTORY" && !s.isDestroyed) || 
                    structures.find(s => !s.isEnemy && s.type === "COMMAND_CENTER" && !s.isDestroyed);

    if (!factory) {
      alert("⚠️ NO WAR FACTORY OR COMMAND CENTER DETECTED: Deploy structure first!");
      return;
    }

    setCredits((prev) => prev - cost);
    spawnUnitInstance(unitId as UnitType, factory.x, factory.y, false);
    playSfx("unit-ready");
  };

  // Helper function to spawn dynamic unit characteristics
  const spawnUnitInstance = (type: UnitType, sx: number, sy: number, isEnemy: boolean) => {
    let health = 400;
    let speed = 1.0;
    let range = 65;
    let damage = 45;
    let cost = 800;

    // Adjust specs depending on military attributes
    if (type === "OVERLORD") {
      health = 1200; speed = 0.55; range = 90; damage = 110; cost = 2000;
    } else if (type === "AURORA") {
      health = 350; speed = 2.4; range = 110; damage = 150; cost = 2000;
    } else if (type === "COMANCHE") {
      health = 500; speed = 1.4; range = 80; damage = 70; cost = 1200;
    } else if (type === "HUMVEE" || type === "TECHNICAL") {
      health = 250; speed = 1.8; range = 55; damage = 35; cost = 500;
    } else if (type === "DRAGON_TANK") {
      health = 550; speed = 1.0; range = 45; damage = 65; cost = 800;
    } else if (type === "SUPPLY_TRUCK" || type === "CHINOOK") {
      health = 300; speed = 1.3; range = 10; damage = 0; cost = 1000;
    }

    const newUnit: Unit = {
      id: "u_" + type + "_" + Date.now() + "_" + Math.round(Math.random() * 100),
      type,
      faction: isEnemy ? opponentFaction : playerFaction,
      isEnemy,
      x: sx,
      y: sy,
      health,
      maxHealth: health,
      speed,
      range,
      damage,
      cost,
      lastFired: 0,
      state: (type === "SUPPLY_TRUCK" || type === "CHINOOK") ? "moving" : "moving",
      angle: isEnemy ? Math.PI : 0,
      salvageLevel: 0
    };

    setUnits((prev) => [...prev, newUnit]);
  };

  // Launcher Superweapon Orbital Strike trigger
  const launchSuperweapon = (tx: number, ty: number) => {
    setIsSwTargeting(false);
    setPlayerSwTimer(180); // Reset countdown timer

    const effType = playerFaction === "USA" 
      ? "PARTICLE_BEAM" 
      : playerFaction === "CHINA" 
      ? "NUCLEAR_STRIKE" 
      : "SCUD_STORM";

    const newSw: SuperweaponEffect = {
      id: "sw_" + Date.now(),
      type: effType as any,
      x: tx,
      y: ty,
      radius: 65,
      duration: 120, // Ticks (2 seconds)
      maxDuration: 120,
      isEnemy: false
    };

    setSuperweapons((prev) => [...prev, newSw]);
    playSfx(playerFaction === "USA" ? "laser" : playerFaction === "CHINA" ? "nuclear" : "explosion");

    // Dynamic banner response
    fetchGeneralCommentary("superweapon_launch");
  };

  // Launch opposing automated AI Superweapons targeting player's base!
  const launchEnemySuperweapon = () => {
    setEnemySwTimer(240);
    const effType = opponentFaction === "USA" 
      ? "PARTICLE_BEAM" 
      : opponentFaction === "CHINA" 
      ? "NUCLEAR_STRIKE" 
      : "SCUD_STORM";

    // Target around coordinates of player command center
    const targetCent = structures.find(s => !s.isEnemy && s.type === "COMMAND_CENTER") || { x: 50, y: 200 };

    const newSw: SuperweaponEffect = {
      id: "sw_enemy_" + Date.now(),
      type: effType as any,
      x: targetCent.x + (Math.random() * 40 - 20),
      y: targetCent.y + (Math.random() * 40 - 20),
      radius: 65,
      duration: 120,
      maxDuration: 120,
      isEnemy: true
    };

    setSuperweapons((prev) => [...prev, newSw]);
    playSfx(opponentFaction === "USA" ? "laser" : opponentFaction === "CHINA" ? "nuclear" : "explosion");
    fetchGeneralCommentary("superweapon_enemy_launch");
  };

  // Main real-time tactical game state calculation loop (RTS simulation ticks!)
  useEffect(() => {
    if (isPaused || isGameOver || isWon) return;

    const interval = setInterval(() => {
      // 1. Resources ticking over time
      // Power calculations
      const totalPowerGen = structures
        .filter(s => !s.isEnemy && s.type === "POWER_PLANT" && !s.isDestroyed)
        .reduce((sum, s) => sum + (s.energyBonus || 0), 0);
      const totalPowerUs = structures
        .filter(s => !s.isEnemy && s.type !== "POWER_PLANT" && !s.isDestroyed)
        .reduce((sum, s) => sum + (s.energyCost || 15), 0);

      setPowerGenerated(playerFaction === "GLA" ? 1 : totalPowerGen);
      setPowerUsed(playerFaction === "GLA" ? 0 : totalPowerUs);

      // Power outage index modifier (USA & China produce slower if power negative!)
      const speedOutageAdjust = (playerFaction !== "GLA" && totalPowerGen < totalPowerUs) ? 0.45 : 1.0;

      // Base passive credits generation
      setCredits((prev) => prev + Math.round(5 * speedOutageAdjust));
      setOpponentCredits((prev) => prev + 5);

      // Superweapon cool-down countdown modifiers
      setPlayerSwTimer((prev) => {
        const hasSW = structures.some(s => !s.isEnemy && s.type === "SUPERWEAPON" && !s.isDestroyed);
        if (hasSW && prev > 0) return prev - 1;
        return prev;
      });

      setEnemySwTimer((prev) => {
        const hasSW = structures.some(s => s.isEnemy && s.type === "SUPERWEAPON" && !s.isDestroyed);
        if (hasSW && prev > 0) return prev - 1;
        if (hasSW && prev === 0) {
          launchEnemySuperweapon();
          return 240;
        }
        return prev;
      });

      // 2. Supply collector harvesting movement loops
      setUnits((prevUnits) => {
        return prevUnits.map((u) => {
          if (u.type === "SUPPLY_TRUCK" || u.type === "CHINOOK") {
            const centerDock = mapTheme.supplyDocks[0] || { x: 200, y: 200 };
            const depot = structures.find(s => s.isEnemy === u.isEnemy && s.type === "SUPPLY_CENTER" && !s.isDestroyed);

            if (!depot) {
              // no depot, stand idle or return to Command center
              const cc = structures.find(s => s.isEnemy === u.isEnemy && s.type === "COMMAND_CENTER" && !s.isDestroyed) || { x: u.isEnemy ? 350 : 50, y: 200 };
              const dx = cc.x - u.x;
              const dy = cc.y - u.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 5) {
                return {
                  ...u,
                  x: u.x + (dx / dist) * u.speed,
                  y: u.y + (dy / dist) * u.speed,
                  angle: Math.atan2(dy, dx)
                };
              }
              return u;
            }

            if (u.state === "moving") {
              // move to Supply dock target
              const dx = centerDock.x - u.x;
              const dy = centerDock.y - u.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 8) {
                return { ...u, state: "harvesting" as any, angle: Math.atan2(dy, dx) };
              }
              return {
                ...u,
                x: u.x + (dx / dist) * u.speed * speedOutageAdjust,
                y: u.y + (dy / dist) * u.speed * speedOutageAdjust,
                angle: Math.atan2(dy, dx)
              };
            } else if (u.state === "harvesting") {
              // harvest complete directly
              return { ...u, state: "returning" as any };
            } else if (u.state === "returning") {
              // move back to collection depot
              const dx = depot.x - u.x;
              const dy = depot.y - u.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 8) {
                // Return payload
                if (u.isEnemy) {
                  setOpponentCredits((c) => c + 350);
                } else {
                  setCredits((c) => c + 350);
                  playSfx("click");
                }
                return { ...u, state: "moving" as any };
              }
              return {
                ...u,
                x: u.x + (dx / dist) * u.speed * speedOutageAdjust,
                y: u.y + (dy / dist) * u.speed * speedOutageAdjust,
                angle: Math.atan2(dy, dx)
              };
            }
          }
          return u;
        });
      });

      // 3. Projectile physics movement calculation loops
      setProjectiles((prevProj) => {
        const nextProj: Projectile[] = [];
        prevProj.forEach((p) => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            // Apply splash/direct damage at impact target!
            setUnits((activeUnits) => {
              return activeUnits.map((u) => {
                if (u.isEnemy !== p.isEnemy) {
                  const uDx = u.x - p.targetX;
                  const uDy = u.y - p.targetY;
                  const uDist = Math.sqrt(uDx * uDx + uDy * uDy);
                  if (uDist < (p.splash ? 35 : 15)) {
                    // deduct health
                    const remainH = u.health - p.damage;
                    if (remainH <= 0) {
                      // Unit killed! Reward credits to player if opponent dies
                      if (u.isEnemy) {
                        setCredits((c) => c + Math.round(u.cost * 0.4));
                        setKills((k) => k + 1);
                      } else {
                        setLosses((l) => l + 1);
                      }
                      playSfx("explosion");
                      return { ...u, health: 0 };
                    }
                    return { ...u, health: remainH };
                  }
                }
                return u;
              }).filter(u => u.health > 0);
            });

            // Damage structures
            setStructures((prevStr) => {
              return prevStr.map((s) => {
                if (s.isEnemy !== p.isEnemy && !s.isDestroyed) {
                  const sDx = s.x - p.targetX;
                  const sDy = s.y - p.targetY;
                  const sDist = Math.sqrt(sDx * sDx + sDy * sDy);
                  if (sDist < 30) {
                    const remainH = s.health - p.damage;
                    if (remainH <= 0) {
                      playSfx("explosion");
                      // check Command Center
                      if (s.type === "COMMAND_CENTER") {
                        if (s.isEnemy) {
                          setIsWon(true);
                          playSfx("victory");
                        } else {
                          setIsGameOver(true);
                          playSfx("failure");
                        }
                      }
                      return { ...s, health: 0, isDestroyed: true };
                    }
                    return { ...s, health: remainH };
                  }
                }
                return s;
              });
            });

            // spawn explosion particles
            createCanvasSparks(p.targetX, p.targetY, p.type === "toxic" ? "#22c55e" : "#f97316");
          } else {
            // continue travel
            nextProj.push({
              ...p,
              x: p.x + (dx / dist) * p.speed,
              y: p.y + (dy / dist) * p.speed
            });
          }
        });
        return nextProj;
      });

      // 4. Combat Units AI combat & engagement range finding
      setUnits((prevUnits) => {
        let combatTicking = prevUnits.map((u) => {
          if (u.type === "SUPPLY_TRUCK" || u.type === "CHINOOK") return u;

          // Find closest opponent entity (Unit or Building)
          let bestTarget: { x: number; y: number; isStructure: boolean; id: string } | null = null;
          let minDist = 9999;

          // Scanning opposing military units
          prevUnits.forEach((other) => {
            if (other.isEnemy !== u.isEnemy && other.id !== u.id && other.health > 0) {
              const dx = other.x - u.x;
              const dy = other.y - u.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                bestTarget = { x: other.x, y: other.y, isStructure: false, id: other.id };
              }
            }
          });

          // Scanning opposing buildings
          structures.forEach((st) => {
            if (st.isEnemy !== u.isEnemy && !st.isDestroyed) {
              const dx = st.x - u.x;
              const dy = st.y - u.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                bestTarget = { x: st.x, y: st.y, isStructure: true, id: st.id };
              }
            }
          });

          if (bestTarget) {
            const targetY = (bestTarget as any).y;
            const targetX = (bestTarget as any).x;
            const dx = targetX - u.x;
            const dy = targetY - u.y;

            if (minDist <= u.range) {
              // Target resides within tactical weapon payload range! Fire projectile
              const fireInterval = u.type === "GATLING_TANK" ? 12 : 36; // speed comparison
              if (Date.now() - u.lastFired > fireInterval * 20) {
                u.lastFired = Date.now();
                u.state = "attacking";
                u.angle = Math.atan2(dy, dx);

                // Spawn projectile matching faction arsenal signature
                const projType = u.faction === "USA" 
                  ? "laser" 
                  : u.faction === "GLA" 
                  ? "toxic" 
                  : u.type === "DRAGON_TANK" 
                  ? "flame" 
                  : "shell";

                const bulletColors = { laser: "#22d3ee", toxic: "#10b981", flame: "#ef4444", shell: "#f97316" };
                const shootSfx = projType === "laser" ? "laser" : "shoot";
                playSfx(shootSfx);

                setProjectiles((p) => [
                  ...p,
                  {
                    id: "p_" + Date.now() + "_" + Math.round(Math.random() * 999),
                    startX: u.x,
                    startY: u.y,
                    x: u.x,
                    y: u.y,
                    targetX,
                    targetY,
                    speed: 3.5,
                    color: bulletColors[projType] || "#f97316",
                    size: projType === "flame" ? 5 : 2,
                    damage: u.damage,
                    splash: u.type === "OVERLORD" || projType === "toxic",
                    isEnemy: u.isEnemy,
                    type: projType as any,
                    t: 0
                  }
                ]);
              }
              return u;
            } else {
              // Target far away, move forward toward its coordinate location
              u.state = "moving";
              const moveSp = u.speed * speedOutageAdjust;
              return {
                ...u,
                x: u.x + (dx / minDist) * moveSp,
                y: u.y + (dy / minDist) * moveSp,
                angle: Math.atan2(dy, dx)
              };
            }
          } else {
            // No custom targets found, continue advancing toward enemy Command Center baseline limit coordinates
            const baseTargetX = u.isEnemy ? 30 : 370;
            const dx = baseTargetX - u.x;
            const dist = Math.abs(dx);
            if (dist > 5) {
              const moveSp = u.speed * speedOutageAdjust;
              return {
                ...u,
                x: u.x + (dx / dist) * moveSp,
                angle: u.isEnemy ? Math.PI : 0
              };
            }
            return u;
          }
        });

        return combatTicking.filter(u => u.health > 0);
      });

      // 5. Defence turrets auto tracking & auto attack triggers
      structures.forEach((st) => {
        if (st.type === "DEFENSE_TURRET" && !st.isDestroyed) {
          // Look for adjacent combat intruders
          units.forEach((u) => {
            if (u.isEnemy !== st.isEnemy && (u.type !== "SUPPLY_TRUCK" && u.type !== "CHINOOK")) {
              const dx = u.x - st.x;
              const dy = u.y - st.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 85) {
                // Auto weapons target locked! Spawns rocket tracers or gatling sprays
                const randCheck = Math.random();
                if (randCheck < 0.12) {
                  playSfx(st.faction === "USA" ? "laser" : "shoot");
                  setProjectiles((p) => [
                    ...p,
                    {
                      id: "turr_p_" + Date.now() + "_" + Math.round(Math.random()*99),
                      startX: st.x,
                      startY: st.y,
                      x: st.x,
                      y: st.y,
                      targetX: u.x,
                      targetY: u.y,
                      speed: 3.8,
                      color: st.faction === "USA" ? "#22d3ee" : st.faction === "GLA" ? "#22c55e" : "#ef4444",
                      size: 2,
                      damage: 60,
                      splash: true,
                      isEnemy: st.isEnemy,
                      type: st.faction === "USA" ? "laser" : "missile",
                      t: 0
                    }
                  ]);
                }
              }
            }
          });
        }
      });

      // 6. Superweapons Area-of-Effect tick impact computations
      setSuperweapons((prevSw) => {
        return prevSw.map((sw) => {
          // deal health damage to all units within coordinates radius
          setUnits((currentUn) => {
            return currentUn.map((u) => {
              if (u.isEnemy !== sw.isEnemy) {
                const dx = u.x - sw.x;
                const dy = u.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < sw.radius) {
                  const damAdjust = sw.type === "NUCLEAR_STRIKE" ? 22 : 8;
                  const remainH = u.health - damAdjust;
                  if (remainH <= 0) {
                    return { ...u, health: 0 };
                  }
                  return { ...u, health: remainH };
                }
              }
              return u;
            }).filter(u => u.health > 0);
          });

          // deal building damage
          setStructures((currentSt) => {
            return currentSt.map((st) => {
              if (st.isEnemy !== sw.isEnemy && !st.isDestroyed) {
                const dx = st.x - sw.x;
                const dy = st.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < sw.radius) {
                  const remainH = st.health - 25;
                  if (remainH <= 0) {
                    return { ...st, health: 0, isDestroyed: true };
                  }
                  return { ...st, health: remainH };
                }
              }
              return st;
            });
          });

          // create dynamic debris particles
          createCanvasSparks(sw.x + (Math.random() * 30 - 15), sw.y + (Math.random()*30 - 15), sw.type === "NUCLEAR_STRIKE" ? "#22c55e" : sw.type === "SCUD_STORM" ? "#a855f7" : "#06b6d4");

          return {
            ...sw,
            duration: sw.duration - 1
          };
        }).filter((sw) => sw.duration > 0);
      });

      // 7. Simulated automated Opponent generals deployment tactics AI strategy builder!
      const aiDecisionChance = Math.random();
      if (aiDecisionChance < 0.04) {
        // AI decides to spawn opponent tank from Command site
        const factory = structures.find(s => s.isEnemy && (s.type === "WAR_FACTORY" || s.type === "COMMAND_CENTER") && !s.isDestroyed);
        if (factory && opponentCredits > 900) {
          const aiOptions = {
            USA: ["CRUSADER", "HUMVEE", "COMANCHE"],
            CHINA: ["BATTLEMASTER", "DRAGON_TANK", "GATLING_TANK"],
            GLA: ["SCORPION", "TECHNICAL", "QUAD_CANNON"]
          }[opponentFaction] || ["SCORPION"];
          
          const selection = aiOptions[Math.floor(Math.random() * aiOptions.length)];
          setOpponentCredits((c) => c - 800);
          spawnUnitInstance(selection as UnitType, factory.x, factory.y, true);
        }
      }

      // AI Decides to build structures on right territory sometimes!
      if (aiDecisionChance < 0.015) {
        const hasSW = structures.some(s => s.isEnemy && s.type === "SUPERWEAPON" && !s.isDestroyed);
        const hasFactory = structures.some(s => s.isEnemy && s.type === "WAR_FACTORY" && !s.isDestroyed);

        if (!hasFactory && opponentCredits > 2000) {
          // Deploy AI War Factory
          setStructures((prev) => [
            ...prev,
            {
              id: "e_wf_" + Date.now(),
              type: "WAR_FACTORY",
              faction: opponentFaction,
              isEnemy: true,
              x: 340,
              y: 130 + Math.random() * 50,
              width: 25,
              height: 25,
              health: 1500,
              maxHealth: 1500,
              cost: 2000
            }
          ]);
          setOpponentCredits((c) => c - 2000);
          fetchGeneralCommentary("build_structure");
        } else if (!hasSW && opponentCredits > 5000) {
          // Deploy AI Superweapon Site!
          setStructures((prev) => [
            ...prev,
            {
              id: "e_sw_" + Date.now(),
              type: "SUPERWEAPON",
              faction: opponentFaction,
              isEnemy: true,
              x: 355,
              y: 320,
              width: 30,
              height: 30,
              health: 3000,
              maxHealth: 3000,
              cost: 5000
            }
          ]);
          setOpponentCredits((c) => c - 5000);
          fetchGeneralCommentary("build_structure");
        }
      }

    }, 150);

    return () => clearInterval(interval);
  }, [structures, units, isPaused, isGameOver, isWon, playerFaction, opponentFaction, credits, opponentCredits, mapTheme]);

  // Canvas Sparks Generators particles emitter
  const createCanvasSparks = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 1;
      const life = Math.random() * 15 + 10;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        life,
        maxLife: life,
        size: Math.random() * 2 + 1
      });
    }
  };

  // Rendering Loop for Real-time Strategy Viewport Board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rId: number;

    const render = () => {
      // Background styled map depending on procedural biome theme
      const w = canvas.width;
      const h = canvas.height;

      // Base biome background color fill
      if (mapTheme.terrainTheme === "SNOW") {
        ctx.fillStyle = "#f1f5f9";
      } else if (mapTheme.terrainTheme === "TOXIC_WASTELAND") {
        ctx.fillStyle = "#0c120c";
      } else if (mapTheme.terrainTheme === "TEMPERATE") {
        ctx.fillStyle = "#14532d";
      } else {
        // DESERT Default
        ctx.fillStyle = "#161c24";
      }
      ctx.fillRect(0, 0, w, h);

      // Rendering border grid lanes
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;
      const step = 40;
      for (let i = 0; i <= w; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }

      // Draw Territory lane demarcation divider
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, 0);
      ctx.lineTo(180, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw neutral supply dock resource points
      mapTheme.supplyDocks.forEach((sd) => {
        ctx.fillStyle = "#e2e8f0";
        // draw supply box stack pile icon
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sd.x - 10, sd.y - 10, 20, 20);

        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(sd.x - 6, sd.y - 6, 12, 12);

        // Dollar crate marking label text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("$", sd.x - 3, sd.y + 3);
      });

      // Draw custom map hazards
      (mapTheme.hazards || []).forEach((ha) => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = mapTheme.primaryColor;

        ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
        ctx.beginPath();
        ctx.arc(ha.x, ha.y, ha.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = mapTheme.primaryColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // label tag
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(ha.x - 25, ha.y + ha.r + 2, 50, 10);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(ha.label.substring(0, 12).toUpperCase(), ha.x, ha.y + ha.r + 9);
      });

      // 1. Draw Structures
      structures.forEach((st) => {
        if (st.isDestroyed) {
          // GLA Holes rebuild concept or ruined building skeleton
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(st.x - st.width / 2, st.y - st.height / 2, st.width, st.height);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(st.x - st.width/2, st.y - st.height/2);
          ctx.lineTo(st.x + st.width/2, st.y + st.height/2);
          ctx.stroke();
          ctx.font = "bold 6px monospace";
          ctx.fillStyle = "#ef4444";
          ctx.fillText("RUIN", st.x - 8, st.y + 2);
          return;
        }

        const x = st.x - st.width / 2;
        const y = st.y - st.height / 2;

        ctx.save();
        // apply glowing shadows corresponding to country faction
        ctx.shadowBlur = 12;
        ctx.shadowColor = st.isEnemy ? "#f43f5e" : "#06b6d4";

        const baseColor = st.isEnemy ? "#be123c" : "#134e5e";
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, st.width, st.height);

        // outline styling borders
        ctx.strokeStyle = st.isEnemy ? "#ef4444" : "#22d3ee";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, st.width, st.height);

        // structural details inner block
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fillRect(x + 4, y + 4, st.width - 8, st.height - 8);

        ctx.restore();

        // structural initials name code
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        const labelStr = st.type.substring(0, 4);
        ctx.fillText(labelStr, st.x, st.y + 2.5);

        // Render health bars
        const hpPercent = st.health / st.maxHealth;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(st.x - 15, y - 8, 30, 3.5);

        ctx.fillStyle = hpPercent > 0.4 ? "#10b981" : "#f43f5e";
        ctx.fillRect(st.x - 15, y - 8, 30 * hpPercent, 3.5);
      });

      // 2. Draw Combat Units
      units.forEach((u) => {
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.rotate(u.angle);

        // draw physical vehicle core chassis
        const isHarv = u.type === "SUPPLY_TRUCK" || u.type === "CHINOOK";
        ctx.fillStyle = isHarv ? "#f59e0b" : u.isEnemy ? "#be123c" : "#115e59";
        
        // dynamic sizing depending on Overlord vs Technical
        const isPlane = u.type === "AURORA";
        if (isPlane || u.type === "COMANCHE") {
          // aircraft wing details
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, 8);
          ctx.lineTo(-8, -8);
          ctx.closePath();
          ctx.fill();
        } else {
          // standard tank tracks box
          ctx.fillRect(-8, -6, 16, 12);
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(2, -3, 6, 6); // gun turret mount
        }

        ctx.restore();

        // draw active weapon line tracers
        if (u.state === "attacking" && !isHarv) {
          ctx.strokeStyle = u.faction === "USA" ? "#22d3ee" : u.faction === "GLA" ? "#22c55e" : "#ef4444";
          ctx.lineWidth = 1;
        }

        // draw small floating indicators below vehicles
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(u.type.substring(0, 5), u.x, u.y + 11);

        // Render unit health bars
        const uHpPercent = u.health / u.maxHealth;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(u.x - 8, u.y - 10, 16, 2.5);

        ctx.fillStyle = uHpPercent > 0.45 ? "#22c55e" : "#f43f5e";
        ctx.fillRect(u.x - 8, u.y - 10, 16 * uHpPercent, 2.5);
      });

      // 3. Draw Projectile Tracers
      projectiles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // tracer lines sweep
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.targetX - p.x) * 0.1, p.y - (p.targetY - p.y) * 0.1);
        ctx.stroke();
      });

      // 4. Draw Superweapon visual impact zones
      superweapons.forEach((sw) => {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = sw.type === "NUCLEAR_STRIKE" ? "#22c55e" : sw.type === "SCUD_STORM" ? "#a855f7" : "#06b6d4";

        const ringColor = sw.type === "NUCLEAR_STRIKE" 
          ? "rgba(34, 197, 94, 0.25)" 
          : sw.type === "SCUD_STORM" 
          ? "rgba(168, 85, 247, 0.25)" 
          : "rgba(6, 182, 212, 0.35)";

        ctx.fillStyle = ringColor;
        ctx.beginPath();
        // Pulsing sweep radius effect
        const pulseR = sw.radius * (1 - sw.duration / sw.maxDuration);
        ctx.arc(sw.x, sw.y, pulseR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = sw.type === "NUCLEAR_STRIKE" ? "#10b981" : sw.type === "SCUD_STORM" ? "#a855f7" : "#22d3ee";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // draw nuke icon or label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.fillText("💥 APOCALYPSE DETECTOR", sw.x - 30, sw.y - pulseR - 4);
      });

      // 5. Particles Update & Render
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.alpha = p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Filter dead spark particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // 6. Draw Territory Boundaries warning overlay
      if (activeBuilding) {
        ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
        ctx.fillRect(0, 0, 180, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(6,182,212,0.4)";
        ctx.strokeRect(0, 0, 180, h);
      }

      rId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rId);

  }, [structures, units, projectiles, superweapons, mapTheme, activeBuilding]);

  // Click on active strategy canvas viewport handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const cy = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    if (isSwTargeting) {
      launchSuperweapon(cx, cy);
      return;
    }

    if (activeBuilding) {
      // Build structures only within left Player base territory (0-180 coordinates limit!)
      if (cx <= 180) {
        handlePlaceStructure(cx, cy);
      } else {
        alert("⚠️ INVALID DEPLOYMENT ZONE: Base structures must reside on the left USA/China/GLA side!");
      }
      return;
    }

    if (isSellMode) {
      // Find structures near click to dismantle
      const target = structures.find(s => !s.isEnemy && Math.abs(s.x - cx) < 18 && Math.abs(s.y - cy) < 18);
      if (target && target.type !== "COMMAND_CENTER") {
        setCredits((prev) => prev + Math.round(target.cost * 0.5));
        setStructures((prev) => prev.filter(s => s.id !== target.id));
        playSfx("explosion");
        setIsSellMode(false);
      }
      return;
    }

    // Default: Click to spawn small particles feedback info
    createCanvasSparks(cx, cy, playerFaction === "USA" ? "#06b6d4" : playerFaction === "CHINA" ? "#f43f5e" : "#10b981");
    playSfx("click");
  };

  useEffect(() => {
    // Spawn initial layout
    resetSkirmishGame(playerFaction, opponentFaction);
    setMessages([
      {
        id: "greet",
        sender: "advisor",
        senderName: "HQ COMBAT COMMAND",
        text: `Logistics sync online. Deploying Battle Group into desert badlands. Assemble structures and clear opponent command baseline!`,
        timestamp: new Date(),
        faction: playerFaction
      }
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-300 flex flex-col font-sans select-none antialiased relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/15 via-slate-950/40 to-[#05070a] pointer-events-none" />

      {/* Primary Header */}
      <header className="border-b border-slate-800/80 bg-[#05070a] px-8 py-6 flex flex-col md:flex-row md:items-end justify-between sticky top-0 z-30 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
            <span className="w-2.5 h-8 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)]"></span>
            NEURAL GENERALS: ZERO HOUR
          </h1>
          <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
            Heuristic Opponent Engine // Tactical Generals Combat Yard
          </p>
        </div>

        {/* Global Action settings */}
        <div className="flex items-center gap-8 font-mono">
          <div className="hidden md:block text-right">
            <p className="text-[9px] text-slate-500 uppercase">Interactive Map</p>
            <p className="text-xs text-amber-500 font-bold tracking-wider uppercase">{mapTheme.mapName}</p>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-[9px] text-slate-500 uppercase">Comm Status</p>
            <p className="text-xs text-emerald-400 font-bold tracking-wider">ACTIVE RADIO NET</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition text-slate-400 hover:text-cyan-400 cursor-pointer"
              id="sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <div className="flex items-center gap-2 bg-[#0a0f18]/90 border border-slate-800 px-3 py-2 rounded-lg">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">CORES:</span>
              <span className="text-xs font-bold text-amber-500">{highScore}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid structure dashboard layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative pb-10">
        
        {/* Left Side: Faction Weapons Control sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <GameSettings
            playerFaction={playerFaction}
            onChangeFaction={handleFactionChange}
            opponentFaction={opponentFaction}
            onChangeOpponentFaction={handleOpponentFactionChange}
            credits={credits}
            powerGenerated={powerGenerated}
            powerUsed={powerUsed}
            activeBuilding={activeBuilding}
            onSelectBuildingToPlace={(type) => {
              setActiveBuilding(type);
              setIsSellMode(false);
              playSfx("click");
            }}
            spawnUnit={spawnUnit}
            onGenerateCustomSkirmish={handleGenerateCustomSkirmish}
            isGeneratingSkirmish={isGeneratingSkirmish}
            onTriggerSellMode={triggerSellMode}
            isSellMode={isSellMode}
          />
        </div>

        {/* Center Side: Active Battle map Viewport canvas */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full bg-slate-900/40 border border-slate-850/80 p-5 rounded-3xl shadow-2xl shadow-cyan-950/10 space-y-4 flex flex-col items-center relative overflow-hidden backdrop-blur-md">
            
            {/* Map title banners */}
            <div className="w-full flex items-center justify-between font-mono text-xs border-b border-slate-800/80 pb-3">
              <div className="space-y-0.5">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block">TACTICAL ZONE THEATER</span>
                <span className="block text-white font-black uppercase text-xs tracking-tight">{mapTheme.mapName}</span>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest">LIVE SATELLITE FEED</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{mapTheme.terrainTheme} Biome</span>
              </div>
            </div>

            {/* Simulated Interactive Map canvas container */}
            <div className="relative border border-slate-800/80 bg-[#05070a]/90 rounded-2xl overflow-hidden shadow-2xl p-1.5 max-w-full">
              
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                onClick={handleCanvasClick}
                className="w-full max-w-[400px] block rounded-xl cursor-crosshair border border-slate-950 relative z-10"
              />

              {/* Status screens overlays */}
              <AnimatePresence>
                {isGameOver && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-20"
                  >
                    <div className="w-12 h-12 bg-rose-950/60 border border-rose-800/30 rounded-xl flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="font-mono text-xl font-black text-rose-500 uppercase tracking-widest mb-1">
                      BASE OBLITERATED
                    </h2>
                    <p className="font-mono text-[10px] text-slate-400 max-w-xs mb-6">
                      Your primary Command Center structures were decimated by enemy General forces.
                    </p>

                    <button
                      onClick={() => resetSkirmishGame(playerFaction, opponentFaction)}
                      className="bg-rose-600 hover:bg-rose-500 text-slate-950 font-mono text-xs font-black py-3 px-6 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      id="reset-defeat-btn"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-950" /> RE-DEPLOY DIVISION
                    </button>
                  </motion.div>
                )}

                {isWon && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-20"
                  >
                    <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-800/30 rounded-xl flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <Trophy className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="font-mono text-xl font-black text-emerald-400 uppercase tracking-widest mb-1">
                      VICTORY COMMITTED
                    </h2>
                    <p className="font-mono text-[10px] text-slate-400 max-w-xs mb-6">
                      Oppponent headquarters completely routed! High command recognizes your strategic supremacy!
                    </p>

                    <button
                      onClick={() => {
                        if (kills > highScore) {
                          setHighScore(kills);
                          localStorage.setItem("ais_generals_highscore", String(kills));
                        }
                        resetSkirmishGame(playerFaction, opponentFaction);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black py-3 px-6 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      id="victory-accept"
                    >
                      BEGIN NEW CAMPAIGN <RotateCcw className="w-4 h-4 text-slate-950" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Armageddon Superweapon Launch timer progress bar */}
            <div className="w-full space-y-2 font-mono">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span className="tracking-widest flex items-center gap-1">
                  <Bomb className={`w-3.5 h-3.5 ${playerSwTimer === 0 ? "text-rose-500 animate-pulse" : "text-cyan-400"}`} /> 
                  SUPERWEAPON COOLDOWN:
                </span>
                <span className={playerSwTimer === 0 ? "text-rose-500 font-bold animate-pulse" : "text-cyan-400 font-bold"}>
                  {playerSwTimer === 0 ? "COSMIC WEAPON CHARGED!" : `${playerSwTimer} SECONDS`}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#05070a] border border-slate-800/65 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-350 shadow-[0_0_8px_rgba(6,182,212,0.5)] ${playerSwTimer === 0 ? "bg-gradient-to-r from-rose-500 to-amber-500 animate-pulse" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                  style={{ width: `${Math.min(100, ((180 - playerSwTimer) / 180) * 100)}%` }}
                />
              </div>

              {/* Sw Launch weapons control trigger */}
              <button
                disabled={playerSwTimer > 0 || isSwTargeting}
                onClick={() => {
                  setIsSwTargeting(true);
                  playSfx("click");
                }}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                  playerSwTimer === 0
                    ? isSwTargeting 
                      ? "bg-amber-950 border-amber-500 text-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-rose-600 hover:bg-rose-500 text-slate-950 border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.45)]"
                    : "bg-slate-950/40 border-slate-900 text-slate-500 opacity-55"
                }`}
                id="sw-launch-main-btn"
              >
                <Target className="w-4 h-4" />
                {isSwTargeting ? "👉 CLICK ON MAP NOW TO DEPLOY ULTIMATE SUPERWEAPON!" : "ARM & FIRE ULTIMATE SUPERWEAPON"}
              </button>
            </div>

            {/* Tactical Grid Telemetry cards overview */}
            <div className="grid grid-cols-2 gap-3 w-full font-mono text-[10px]">
              <div className="bg-[#05070a]/65 p-3 rounded-xl border border-slate-800/50">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Your Total Funds</p>
                <p className="text-sm font-black text-emerald-400 tracking-tight">${credits.toLocaleString()}</p>
              </div>
              <div className="bg-[#05070a]/65 p-3 rounded-xl border border-slate-800/50">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Opponent Funds</p>
                <p className="text-sm font-black text-rose-400 tracking-tight">${opponentCredits.toLocaleString()}</p>
              </div>
            </div>

            {/* Bottom Quick Control buttons */}
            <div className="w-full flex gap-3 border-t border-slate-800/70 pt-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                disabled={isGameOver || isWon}
                className="flex-1 bg-[#05070a] hover:bg-slate-900 border border-slate-850 text-[10px] font-mono font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer text-slate-350"
                id="skirmish-play-pause"
              >
                {isPaused ? <Play className="w-4 h-4 text-cyan-500 animate-pulse" /> : <Play className="w-4 h-4 text-red-500 rotate-90" />}
                {isPaused ? "UNFREEZE INTERFACE" : "FREEZE MATCH ENGINE"}
              </button>

              <button
                onClick={() => resetSkirmishGame(playerFaction, opponentFaction)}
                className="bg-[#05070a] border border-slate-850 hover:bg-slate-900 p-2.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                id="skirmish-reset-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-450" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Radio Net Chat log sidebar */}
        <div className="lg:col-span-4 h-full">
          <SenseiConsole
            messages={messages}
            onSendMessage={handleUserQuestion}
            isLoading={isLoadingChat}
            playerFaction={playerFaction}
            opponentFaction={opponentFaction}
            matchStats={{
              credits,
              kills,
              losses
            }}
          />
        </div>
      </main>

      {/* Primary footer metadata details */}
      <footer className="w-full max-w-7xl mx-auto px-6 pb-8 mt-auto flex justify-between items-center text-[9px] text-slate-600 font-mono tracking-[0.2em] border-t border-slate-900/80 pt-6">
        <div className="flex gap-6 uppercase">
          <span>Session ID: CNC-991-Z</span>
          <span>Core Link: SECURE SEC_NET_07</span>
          <span>Faction: {playerFaction}</span>
        </div>
        <div className="uppercase text-right">
          &copy; {new Date().getFullYear()} ELECTRONIC INTELLIGENCE LABS
        </div>
      </footer>
    </div>
  );
}
