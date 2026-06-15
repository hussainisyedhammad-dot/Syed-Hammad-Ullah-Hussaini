import { useState, useEffect, useRef, useCallback } from "react";
import { Point, Direction, Level, ChatMessage, Particle } from "./types";
import { getNextAiMove, findShortestPath, pointToKey, pointsEqual } from "./utils/aiSolver";
import SenseiConsole from "./components/SenseiConsole";
import GameSettings from "./components/GameSettings";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Gamepad2,
  Zap,
  Terminal,
  Cpu,
  ArrowRight,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Canvas Grid Config
const GRID_CELLS = 20;

const DEFAULT_LEVELS: Level[] = [
  {
    id: 1,
    name: "Neon Greenfield",
    description: "Open training terrain. Low grid clutter. Ideal for testing human micro-reflexes.",
    obstacles: [],
    speed: 130,
    targetScore: 10,
    colorTheme: "green",
  },
  {
    id: 2,
    name: "Security Perimeter",
    description: "Solid shield walls surround the outer lanes. Steer with caution or trigger the AI.",
    obstacles: [
      // Outer barrier with narrow exits in the center of each side
      ...Array.from({ length: 16 }, (_, i) => ({ r: 1, c: i + 2 })),
      ...Array.from({ length: 16 }, (_, i) => ({ r: 18, c: i + 2 })),
      ...Array.from({ length: 16 }, (_, i) => ({ r: i + 2, c: 1 })),
      ...Array.from({ length: 16 }, (_, i) => ({ r: i + 2, c: 18 })),
    ].filter(p => !(p.r === 10 || p.c === 10)), // leave centers open
    speed: 110,
    targetScore: 12,
    colorTheme: "sky",
  },
  {
    id: 3,
    name: "Cyber Quad Pillars",
    description: "Four massive solid compiler hubs block navigation. Narrow pathways limit escape vectors.",
    obstacles: [
      // Top-Left pillar
      { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 5, c: 4 }, { r: 5, c: 5 },
      // Top-Right pillar
      { r: 4, c: 14 }, { r: 4, c: 15 }, { r: 5, c: 14 }, { r: 5, c: 15 },
      // Bottom-Left pillar
      { r: 14, c: 4 }, { r: 14, c: 5 }, { r: 15, c: 4 }, { r: 15, c: 5 },
      // Bottom-Right pillar
      { r: 14, c: 14 }, { r: 14, c: 15 }, { r: 15, c: 14 }, { r: 15, c: 15 },
    ],
    speed: 95,
    targetScore: 15,
    colorTheme: "purple",
  },
  {
    id: 4,
    name: "The Binary Gorges",
    description: "Deep diagonal pipelines slice the game screen. Snake must execute winding curves to proceed.",
    obstacles: [
      ...Array.from({ length: 8 }, (_, i) => ({ r: i + 1, c: i + 1 })),
      ...Array.from({ length: 8 }, (_, i) => ({ r: i + 1, c: 18 - i })),
      ...Array.from({ length: 8 }, (_, i) => ({ r: 18 - i, c: i + 1 })),
      ...Array.from({ length: 8 }, (_, i) => ({ r: 18 - i, c: 18 - i })),
    ].filter(p => !(p.r >= 7 && p.r <= 12 && p.c >= 7 && p.c <= 12)), // clear center spawn
    speed: 80,
    targetScore: 18,
    colorTheme: "rose",
  },
  {
    id: 5,
    name: "Neural Matrix Gateway",
    description: "A central complex gateway that handles system data routing. Complex, dense, super speed.",
    obstacles: [
      // Central ring structure with gaps
      { r: 7, c: 7 }, { r: 7, c: 8 }, { r: 7, c: 11 }, { r: 7, c: 12 },
      { r: 12, c: 7 }, { r: 12, c: 8 }, { r: 12, c: 11 }, { r: 12, c: 12 },
      { r: 8, c: 7 }, { r: 11, c: 7 }, { r: 8, c: 12 }, { r: 11, c: 12 },
      // Small defensive outer corner ticks
      { r: 3, c: 3 }, { r: 3, c: 16 }, { r: 16, c: 3 }, { r: 16, c: 16 }
    ],
    speed: 65,
    targetScore: 20,
    colorTheme: "amber",
  }
];

export default function App() {
  const [levels, setLevels] = useState<Level[]>(DEFAULT_LEVELS);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  // Core Game Fields
  const [snake, setSnake] = useState<Point[]>([]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [lastDirection, setLastDirection] = useState<Direction>("RIGHT");
  const [food, setFood] = useState<Point>({ r: 5, c: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem("ai_snake_highscore")) || 0;
  });

  // Game statuses
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [aiAutoplay, setAiAutoplay] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Custom AI comments & chat arrays
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isGeneratingLevel, setIsGeneratingLevel] = useState(false);

  // Graphics (Canvas)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Ref to tracking audio oscillator
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeLevel = levels[currentLevelIndex];

  // Map theme colors to specific hex codes for Canvas rendering
  const canvasColorDict: Record<string, { snake: string; head: string; grid: string; glow: string; obstacle: string }> = {
    green: { snake: "#10b981", head: "#059669", grid: "#064e3b", glow: "rgba(16,185,129,0.3)", obstacle: "#047857" },
    sky: { snake: "#0ea5e9", head: "#0284c7", grid: "#0c4a6e", glow: "rgba(14,165,233,0.3)", obstacle: "#0369a1" },
    purple: { snake: "#a855f7", head: "#9333ea", grid: "#581c87", glow: "rgba(168,85,247,0.3)", obstacle: "#7e22ce" },
    rose: { snake: "#f43f5e", head: "#e11d48", grid: "#881337", glow: "rgba(244,63,94,0.3)", obstacle: "#be123c" },
    amber: { snake: "#f59e0b", head: "#d97706", grid: "#78350f", glow: "rgba(245,158,11,0.3)", obstacle: "#b45309" },
  };

  const getCanvasPalette = (color: string) => {
    return canvasColorDict[color] || canvasColorDict.green;
  };

  // Sound Synth Generator (WebAudio)
  const playSynthSound = useCallback((frequency: number, type: OscillatorType, duration: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("WebAudio context not loaded yet.");
    }
  }, [soundEnabled]);

  // Handle dynamic AI Coach commentator text POST request
  const fetchSenseiCommentary = async (event: string, overideScore?: number) => {
    try {
      const resp = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelName: activeLevel.name,
          score: overideScore !== undefined ? overideScore : score,
          event,
          aiAutoplay,
          highscore: highScore,
        }),
      });
      const data = await resp.json();
      if (data.commentary) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            sender: "sensei",
            text: data.commentary,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Sensei link sluggish.", err);
    }
  };

  // Generate random food spot bypassing obstacles & snake segments
  const generateNewFood = useCallback((currentSnake: Point[], obstacles: Point[]): Point => {
    const blockedSet = new Set<string>();
    currentSnake.forEach(p => blockedSet.add(pointToKey(p)));
    obstacles.forEach(p => blockedSet.add(pointToKey(p)));

    const vacantCells: Point[] = [];
    for (let r = 0; r < GRID_CELLS; r++) {
      for (let c = 0; c < GRID_CELLS; c++) {
        const testPt = { r, c };
        if (!blockedSet.has(pointToKey(testPt))) {
          vacantCells.push(testPt);
        }
      }
    }

    if (vacantCells.length > 0) {
      const randIdx = Math.floor(Math.random() * vacantCells.length);
      return vacantCells[randIdx];
    }
    // absolute fallback
    return { r: 5, c: 5 };
  }, []);

  // Set up initial state of a level
  const initGame = useCallback((lvlIndex: number) => {
    const lvl = levels[lvlIndex];
    // spawn in the center of row 10, extending leftwards
    const initialSnake: Point[] = [
      { r: 10, c: 10 },
      { r: 10, c: 9 },
      { r: 10, c: 8 },
      { r: 10, c: 7 },
      { r: 10, c: 6 },
    ];
    setSnake(initialSnake);
    setDirection("RIGHT");
    setLastDirection("RIGHT");
    setScore(0);
    setIsGameOver(false);
    setIsWin(false);
    setIsPaused(true);

    const initialFood = generateNewFood(initialSnake, lvl.obstacles);
    setFood(initialFood);
    particlesRef.current = [];
  }, [levels, generateNewFood]);

  // Trigger loading initial screen messages
  useEffect(() => {
    initGame(currentLevelIndex);
    setMessages([
      {
        id: "greet",
        sender: "sensei",
        text: `LOG_IN successful. Welcome to Level ${currentLevelIndex + 1}: ${activeLevel.name}. Feed my data loops to cross the ${activeLevel.targetScore}-byte target threshold.`,
        timestamp: new Date(),
      },
    ]);
  }, [currentLevelIndex, initGame]);

  // Handle Level architecture custom generation (Gemini)
  const handleGenerateCustomLevel = async (prompt: string) => {
    setIsGeneratingLevel(true);
    try {
      const resp = await fetch("/api/generate-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();

      if (data.levelName) {
        const parsedObstacles = (data.obstacles || []).map((o: any) => ({
          r: Math.max(0, Math.min(GRID_CELLS - 1, Number(o.r))),
          c: Math.max(0, Math.min(GRID_CELLS - 1, Number(o.c)))
        }));

        const newCustomLevel: Level = {
          id: `custom_${Date.now()}`,
          name: data.levelName,
          description: data.themeDescription || `Custom Gemini AI built level of ${prompt}.`,
          obstacles: parsedObstacles,
          speed: data.recommendedSpeed || 95,
          targetScore: 15,
          colorTheme: data.colorTheme || "purple"
        };

        setLevels((prev) => [...prev, newCustomLevel]);
        // select immediately
        setCurrentLevelIndex(levels.length);
        playSynthSound(587.33, "triangle", 0.45); // cool confirmation chord
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLevel(false);
    }
  };

  // Handle custom user questions in Chat Box (Gemini endpoint)
  const handleUserChatMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "player",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const resp = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelName: activeLevel.name,
          score,
          highscore: highScore,
          aiAutoplay,
          customQuestion: text,
        }),
      });
      const data = await resp.json();
      if (data.commentary) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            sender: "sensei",
            text: data.commentary,
            timestamp: new Date(),
          },
        ]);
        playSynthSound(440, "sine", 0.1);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "sensei",
          text: "Neural link lost. Secure grid vectors and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Render loop particles emitter
  const createExplosion = (x: number, y: number, colorTheme: string) => {
    const colors = {
      green: ["#34d399", "#10b981", "#059669", "#ffffff"],
      sky: ["#38bdf8", "#0ea5e9", "#0284c7", "#ffffff"],
      purple: ["#c084fc", "#a855f7", "#9333ea", "#ffffff"],
      rose: ["#fb7185", "#f43f5e", "#e11d48", "#ffffff"],
      amber: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff"]
    }[colorTheme] || ["#34d399", "#ffffff"];

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      const life = Math.random() * 20 + 15;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life,
        maxLife: life,
        size: Math.random() * 3 + 1.5,
      });
    }
  };

  // Moving forward tick action
  const runGameTick = useCallback(() => {
    if (isGameOver || isPaused || isWin) return;

    let nextDir = direction;

    // AI solver guidance
    if (aiAutoplay) {
      const aiDecision = getNextAiMove(snake, food, activeLevel.obstacles, GRID_CELLS);
      if (aiDecision) {
        // convert vector to Directions
        const head = snake[0];
        if (aiDecision.r < head.r) nextDir = "UP";
        else if (aiDecision.r > head.r) nextDir = "DOWN";
        else if (aiDecision.c < head.c) nextDir = "LEFT";
        else if (aiDecision.c > head.c) nextDir = "RIGHT";
        setDirection(nextDir);
      }
    }

    setLastDirection(nextDir);

    const head = snake[0];
    let nextRow = head.r;
    let nextCol = head.c;

    switch (nextDir) {
      case "UP": nextRow -= 1; break;
      case "DOWN": nextRow += 1; break;
      case "LEFT": nextCol -= 1; break;
      case "RIGHT": nextCol += 1; break;
    }

    const nextHead: Point = { r: nextRow, c: nextCol };

    // Collisions check (bounds & solid obstacle structures)
    const isOut = nextRow < 0 || nextRow >= GRID_CELLS || nextCol < 0 || nextCol >= GRID_CELLS;
    const bodySet = new Set(snake.map(p => pointToKey(p)));
    
    // We can step safely at the tail sector only if the length does not grow
    const hitsSelf = bodySet.has(pointToKey(nextHead)) && !pointsEqual(nextHead, snake[snake.length - 1]);
    const hitsObstacle = activeLevel.obstacles.some(obs => pointsEqual(obs, nextHead));

    if (isOut || hitsSelf || hitsObstacle) {
      setIsGameOver(true);
      playSynthSound(150, "sawtooth", 0.6); // solid blast synth crash
      fetchSenseiCommentary("die", score);

      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("ai_snake_highscore", String(score));
      }
      return;
    }

    // Step into target cell
    const newSnake = [nextHead, ...snake];

    if (pointsEqual(nextHead, food)) {
      // EAT BYTE Data!
      const nextScore = score + 1;
      setScore(nextScore);
      playSynthSound(880, "sine", 0.15); // high pitch byte beep

      // create visual spark particle loops
      if (canvasRef.current) {
        const cellW = canvasRef.current.width / GRID_CELLS;
        const sparksX = nextCol * cellW + cellW / 2;
        const sparksY = nextRow * cellW + cellW / 2;
        createExplosion(sparksX, sparksY, activeLevel.colorTheme);
      }

      // Check for level target completions
      if (nextScore >= activeLevel.targetScore) {
        setIsWin(true);
        playSynthSound(1046.5, "sine", 0.55); // triumph higher sweep
        fetchSenseiCommentary("level_up", nextScore);
      } else {
        // continue, spawn new byte
        setFood(generateNewFood(newSnake, activeLevel.obstacles));
        // optional async comment (throttled/intermittent score milestones)
        if (nextScore % 4 === 0) {
          fetchSenseiCommentary("eat", nextScore);
        }
      }
    } else {
      // release tail
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [snake, direction, aiAutoplay, food, activeLevel, score, isGameOver, isPaused, isWin, highScore]);

  // Timed tick loop
  useEffect(() => {
    if (isGameOver || isPaused || isWin) return;
    const intervalTime = activeLevel.speed / speedMultiplier;
    const loop = setInterval(() => {
      runGameTick();
    }, intervalTime);
    return () => clearInterval(loop);
  }, [snake, direction, isGameOver, isPaused, isWin, activeLevel, speedMultiplier, aiAutoplay, runGameTick]);

  // Capture manual keyboard inputs
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (aiAutoplay || isGameOver || isPaused || isWin) return;

      let nextDir: Direction | null = null;
      switch (e.key) {
        // ARROW KEYS / WASD
        case "ArrowUp":
        case "w":
        case "W":
          if (lastDirection !== "DOWN") nextDir = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (lastDirection !== "UP") nextDir = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (lastDirection !== "RIGHT") nextDir = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (lastDirection !== "LEFT") nextDir = "RIGHT";
          break;
        // PAUSE SPACE
        case " ":
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }

      if (nextDir) {
        e.preventDefault();
        setDirection(nextDir);
        playSynthSound(440, "sine", 0.04); // tiny tick sound response
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [lastDirection, aiAutoplay, isGameOver, isPaused, isWin, playSynthSound]);

  // Toggle AI Autoplay triggers commentary feeds
  const handleToggleAiPlay = (val: boolean) => {
    setAiAutoplay(val);
    playSynthSound(660, "sawtooth", 0.2);
    fetchSenseiCommentary(val ? "ai_on" : "ai_off");
  };

  // Draw Game Canvas Board loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cellW = w / GRID_CELLS;
      const cellH = h / GRID_CELLS;
      const palette = getCanvasPalette(activeLevel.colorTheme);

      // 1. Draw Grid Canvas Background
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);

      // Subtle ambient scan grid lines
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_CELLS; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, h);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(w, i * cellH);
        ctx.stroke();
      }

      // 2. Render Pathfinding Dotted Trail (Draws AI computed path to food!)
      if (aiAutoplay && snake.length > 0) {
        const blockedSet = new Set<string>();
        activeLevel.obstacles.forEach(p => blockedSet.add(pointToKey(p)));
        for (let i = 0; i < snake.length - 1; i++) {
          blockedSet.add(pointToKey(snake[i]));
        }

        const computedPath = findShortestPath(snake[0], food, blockedSet, GRID_CELLS);
        if (computedPath && computedPath.length > 1) {
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          computedPath.forEach((pt, idx) => {
            const x = pt.c * cellW + cellW / 2;
            const y = pt.r * cellH + cellH / 2;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          ctx.setLineDash([]); // clear line dash
        }
      }

      // 3. Render Solid Walls / Obstacles
      activeLevel.obstacles.forEach((obs) => {
        const x = obs.c * cellW;
        const y = obs.r * cellH;

        // neon metal container block
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

        ctx.strokeStyle = palette.snake;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

        // metallic core lines
        ctx.fillStyle = palette.grid;
        ctx.fillRect(x + 6, y + 6, cellW - 12, cellH - 12);
      });

      // 4. Render Byte Targets (Food)
      const foodX = food.c * cellW;
      const foodY = food.r * cellH;

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = palette.snake;

      // pulsing food animation
      const scale = 1 + Math.sin(Date.now() / 150) * 0.15;
      const fw = (cellW - 8) * scale;
      const fh = (cellH - 8) * scale;
      const fx = foodX + (cellW - fw) / 2;
      const fy = foodY + (cellH - fh) / 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(fx, fy, fw, fh);
      ctx.strokeStyle = palette.snake;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(fx, fy, fw, fh);

      ctx.restore();

      // 5. Render Snake body segments
      snake.forEach((segment, idx) => {
        const x = segment.c * cellW;
        const y = segment.r * cellH;
        const isHead = idx === 0;

        ctx.save();
        if (isHead) {
          // Glow head
          ctx.shadowBlur = 10;
          ctx.shadowColor = palette.snake;
          ctx.fillStyle = palette.head;
        } else {
          // Fade body segments to tail
          ctx.fillStyle = palette.snake;
          ctx.globalAlpha = 1 - (idx / snake.length) * 0.65;
        }

        // rounded cells
        const pad = isHead ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2, isHead ? 6 : 4);
        ctx.fill();
        ctx.restore();

        // Eye drawings on head pointing to travelling Direction
        if (isHead) {
          ctx.fillStyle = "#ffffff";
          const dY = direction;
          let eyeL_X = 0, eyeL_Y = 0, eyeR_X = 0, eyeR_Y = 0;

          if (dY === "RIGHT" || dY === "LEFT" || dY === "UP" || dY === "DOWN") {
            if (dY === "RIGHT") {
              eyeL_X = x + cellW - 6; eyeL_Y = y + 5;
              eyeR_X = x + cellW - 6; eyeR_Y = y + cellH - 8;
            } else if (dY === "LEFT") {
              eyeL_X = x + 6; eyeL_Y = y + 5;
              eyeR_X = x + 6; eyeR_Y = y + cellH - 8;
            } else if (dY === "UP") {
              eyeL_X = x + 5; eyeL_Y = y + 6;
              eyeR_X = x + cellW - 8; eyeR_Y = y + 6;
            } else if (dY === "DOWN") {
              eyeL_X = x + 5; eyeL_Y = y + cellH - 8;
              eyeR_X = x + cellW - 8; eyeR_Y = y + cellH - 8;
            }
          }

          ctx.fillRect(eyeL_X, eyeL_Y, 2.5, 2.5);
          ctx.fillRect(eyeR_X, eyeR_Y, 2.5, 2.5);
        }
      });

      // 6. Sparks update & rendering
      particlesRef.current.forEach((p, idx) => {
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

      // clean dead sparks
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // 7. Render Retro Scanlines Overlay effects
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      for (let line = 0; line < h; line += 3) {
        ctx.fillRect(0, line, w, 1);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [snake, activeLevel, direction, aiAutoplay, food]);

  const progressPercent = Math.min(100, Math.round((score / activeLevel.targetScore) * 100));

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-300 flex flex-col font-sans select-none antialiased relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/15 via-slate-950/40 to-[#05070a] pointer-events-none" />

      {/* Primary Header */}
      <header className="border-b border-slate-800/80 bg-[#05070a] px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between sticky top-0 z-30 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
            <span className="w-2.5 h-8 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)]"></span>
            NEURAL SERPENT
          </h1>
          <p className="text-[11px] font-mono text-cyan-500/60 uppercase tracking-[0.2em] mt-1.5">
            Autonomous Heuristic Agent // Engine v4.2.0
          </p>
        </div>

        {/* Action Controls & Telemetry Stats */}
        <div className="flex items-center gap-8 font-mono self-end sm:self-auto">
          <div className="hidden md:block text-right">
            <p className="text-[9px] text-slate-500 uppercase mb-0.5">System Status</p>
            <p className="text-xs text-emerald-400 font-bold tracking-wider">OPERATIONAL</p>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-[9px] text-slate-500 uppercase mb-0.5">Connection</p>
            <p className="text-xs text-white uppercase font-bold tracking-wider">SECURE ENCRYPTED</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition text-slate-400 hover:text-cyan-400 cursor-pointer"
              id="audio-toggle-btn"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Highscore HUD */}
            <div className="flex items-center gap-2 bg-[#0a0f18]/90 border border-slate-800 px-3.5 py-2 rounded-lg">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">HIGH:</span>
              <span className="text-xs font-bold text-amber-500">{highScore}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative pb-12">
        
        {/* Sidebar 1: Settings */}
        <div className="lg:col-span-3 space-y-4">
          <GameSettings
            levels={levels}
            currentLevelIndex={currentLevelIndex}
            onSelectLevel={setCurrentLevelIndex}
            onGenerateCustomLevel={handleGenerateCustomLevel}
            isGeneratingLevel={isGeneratingLevel}
            aiAutoplay={aiAutoplay}
            setAiAutoplay={handleToggleAiPlay}
            speedMultiplier={speedMultiplier}
            setSpeedMultiplier={setSpeedMultiplier}
          />
        </div>

        {/* Central Component: Game Console Screen */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full bg-slate-900/40 border border-slate-850/80 p-6 rounded-3xl shadow-2xl shadow-cyan-950/10 space-y-5 flex flex-col items-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyan-500/5 blur-3xl pointer-events-none" />

            {/* Level Title Indicators */}
            <div className="w-full flex items-center justify-between font-mono text-xs border-b border-slate-800/80 pb-3">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">ARENA CORE MODULE</span>
                <span className="block text-white font-black uppercase text-sm tracking-tight">{activeLevel.name}</span>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">LIVE FEED</span>
                </div>
                <span className="block text-cyan-400 font-bold text-[11px]">
                  {(activeLevel.speed / speedMultiplier).toFixed(0)} ms PER TICK
                </span>
              </div>
            </div>

            {/* Visual Screen Container */}
            <div className="relative border border-slate-800/80 bg-[#05070a]/90 rounded-2xl overflow-hidden shadow-2xl p-1.5 max-w-full">
              {/* Simulation Grid Scanline Background */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:15px_15px]" />
              
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="w-full max-w-[400px] block rounded-xl cursor-none border border-slate-950 relative z-10"
              />

              {/* Status HUD Overlays */}
              <AnimatePresence>
                {isGameOver && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-20"
                  >
                    <div className="w-12 h-12 bg-rose-950/60 border border-rose-800/30 rounded-xl flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <h2 className="font-mono text-xl font-black text-rose-500 uppercase tracking-widest mb-1">
                      GRID CRASHED
                    </h2>
                    <p className="font-mono text-xs text-slate-400 max-w-xs mb-6">
                      System collision detected at sector indices. Byte trail destroyed.
                    </p>

                    <div className="bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-lg font-mono text-sm text-slate-300 mb-6">
                      FINAL HARDWARE SCORE: <span className="text-cyan-400 font-black">{score}</span>
                    </div>

                    <button
                      onClick={() => initGame(currentLevelIndex)}
                      className="bg-rose-600 hover:bg-rose-500 text-slate-950 font-mono text-xs font-black py-3 px-6 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      id="retry-btn"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-950" /> FLUSH SYSTEM DATA
                    </button>
                  </motion.div>
                )}

                {isWin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-20"
                  >
                    <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-800/30 rounded-xl flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <Trophy className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="font-mono text-xl font-black text-emerald-400 uppercase tracking-widest mb-1">
                      LEVEL TRANSMITTED
                    </h2>
                    <p className="font-mono text-xs text-slate-400 max-w-xs mb-6">
                      Target of {activeLevel.targetScore} bytes recorded in firmware sectors securely.
                    </p>

                    <button
                      onClick={() => {
                        const nextLevelIndex = (currentLevelIndex + 1) % levels.length;
                        setCurrentLevelIndex(nextLevelIndex);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black py-3 px-6 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      id="next-level-btn"
                    >
                      ACCESS NEXT ARENA <ArrowRight className="w-4 h-4 text-slate-950" />
                    </button>
                  </motion.div>
                )}

                {isPaused && !isGameOver && !isWin && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#05070a]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 select-none z-20"
                  >
                    <div className="w-12 h-12 bg-cyan-950/60 border border-cyan-800/20 rounded-xl flex items-center justify-center text-cyan-400 mb-4 cursor-pointer hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)]" onClick={() => setIsPaused(false)}>
                      <Play className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="font-mono text-xs text-slate-300 font-bold uppercase tracking-widest mb-2 text-center">
                      SYSTEM PAUSED
                    </span>
                    <p className="font-mono text-[10px] text-slate-500 max-w-xs text-center leading-relaxed uppercase tracking-wider">
                      Press <span className="text-cyan-400">Spacebar</span> or click start to link grid connection streams.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In-Game Score Progress HUD */}
            <div className="w-full space-y-2">
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span className="text-[10px] tracking-widest">BUFFER INDEX:</span>
                <span className="text-cyan-400 font-bold">{score} / {activeLevel.targetScore} Bytes</span>
              </div>
              <div className="w-full h-1.5 bg-[#05070a] border border-slate-800/65 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Neural Telemetry Cards block */}
            <div className="grid grid-cols-2 gap-3 w-full font-mono">
              <div className="bg-[#05070a]/65 p-3.5 rounded-xl border border-slate-800/50">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Iteration Count</p>
                <p className="text-lg font-black text-white tracking-tight">{(snake.length * 114 + score * 34).toLocaleString()}</p>
              </div>
              <div className="bg-[#05070a]/65 p-3.5 rounded-xl border border-slate-800/50">
                <p className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Grid Confidence</p>
                <p className="text-lg font-black text-cyan-400 tracking-tight">{aiAutoplay ? "99.2% BFS" : "Human LUA"}</p>
              </div>
            </div>

            {/* Quick Button Panel */}
            <div className="w-full flex gap-3 border-t border-slate-800/70 pt-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                disabled={isGameOver || isWin}
                className="flex-1 bg-[#05070a] hover:bg-slate-900 border border-slate-800 text-xs font-mono font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer text-slate-350"
                id="play-pause-btn"
              >
                {isPaused ? <Play className="w-4 h-4 text-cyan-500 animate-pulse" /> : <Pause className="w-4 h-4 text-rose-500" />}
                {isPaused ? "UNLEASH PROCESS" : "HALT INTERFACE"}
              </button>

              <button
                onClick={() => initGame(currentLevelIndex)}
                className="bg-[#05070a] border border-slate-800 hover:bg-slate-900 p-2.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                id="reset-game-btn"
              >
                <RotateCcw className="w-4 h-4 text-slate-400 hover:text-cyan-450" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar 2: AI Coach Commentary Chat Box */}
        <div className="lg:col-span-4 h-full">
          <SenseiConsole
            messages={messages}
            onSendMessage={handleUserChatMessage}
            isLoading={isLoadingChat}
            aiAutoplay={aiAutoplay}
            currentLevelName={activeLevel.name}
            gameScore={score}
            highScore={highScore}
          />
        </div>
      </main>

      {/* Footer Details */}
      <footer className="w-full max-w-7xl mx-auto px-6 pb-8 mt-auto flex justify-between items-center text-[9px] text-slate-600 font-mono tracking-[0.2em] border-t border-slate-900/80 pt-6">
        <div className="flex gap-6 uppercase">
          <span>Session ID: 492-X-991</span>
          <span>Node: US-WEST-01</span>
        </div>
        <div className="uppercase text-right">
          &copy; 2026 SYNTHETIC INTELLIGENCE LABS
        </div>
      </footer>
    </div>
  );
}
