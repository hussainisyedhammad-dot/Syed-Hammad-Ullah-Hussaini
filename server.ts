import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for level generation
  app.post("/api/generate-level", async (req, res) => {
    try {
      const { prompt } = req.body;
      const userPrompt = prompt || "obstacle layout like a symmetric cross";

      const promptString = `Design a custom grid level of size 20x20 based on this style request: "${userPrompt}". 
Return a list of solid walls (obstacle coordinates). Each wall must have separate row (r) and column (c) between 0 and 19.
CRITICAL DESIGN RULES:
1. Do not place any obstacle at or near the center coordinates {r: 10, c: 10} to allow the snake to spawn safely. Spawn area is 5x5 zone in the center which must be completely empty: row 8 to 12, col 8 to 12 must NOT have obstacles.
2. Ensure the level is playable: do not trap or seal any areas. Leaving clear spaces and paths of at least 2 units wide is recommended.
3. Keep the total number of obstacle cells between 15 and 45. Too many obstacles make it impossible to play.
4. Try to be creative, represent the requested visual style or theme.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptString,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              levelName: { type: Type.STRING, description: "A creative, short, cool name of the level" },
              themeDescription: { type: Type.STRING, description: "A brief atmospheric description explaining how this represents the prompt" },
              colorTheme: { type: Type.STRING, description: "A main tailwind theme style (one of: 'purple', 'emerald', 'sky', 'amber', 'rose', 'indigo', 'violet', 'cyan', 'lime')" },
              obstacles: {
                type: Type.ARRAY,
                description: "Array of coordinates to put solid blocks",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    r: { type: Type.INTEGER, description: "Row index (0-19)" },
                    c: { type: Type.INTEGER, description: "Column index (0-19)" }
                  },
                  required: ["r", "c"]
                }
              },
              recommendedSpeed: { type: Type.INTEGER, description: "Speed in ms (from 75 to 140, fast/slow depending on obstacle density)" }
            },
            required: ["levelName", "themeDescription", "colorTheme", "obstacles", "recommendedSpeed"]
          }
        }
      });

      const levelData = JSON.parse(response.text || "{}");
      res.json(levelData);
    } catch (err: any) {
      console.error("Error generating level:", err);
      // Fallback level
      res.status(500).json({
        error: "Failed to generate custom level from Gemini.",
        levelName: "Digital Frontier",
        themeDescription: "A fallback level designed when the AI was busy, simple yet effective.",
        colorTheme: "purple",
        obstacles: [
          { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 4, c: 6 },
          { r: 4, c: 13 }, { r: 4, c: 14 }, { r: 4, c: 15 },
          { r: 15, c: 4 }, { r: 15, c: 5 }, { r: 15, c: 6 },
          { r: 15, c: 13 }, { r: 15, c: 14 }, { r: 15, c: 15 }
        ],
        recommendedSpeed: 100
      });
    }
  });

  // API Route for dynamic commentary
  app.post("/api/commentary", async (req, res) => {
    try {
      const { levelName, score, event, aiAutoplay, highscore, customQuestion } = req.body;

      const systemInstruction = "You are the 'AI Snake Sensei', a witty, enthusiastic, and highly technical retro gaming coach. " +
        "Keep your replies very short (under 25 words). Be direct, retro-infused, funny, and reactive. " +
        "Reference things like byte sectors, raster scans, algorithms, human neural loops, or electronic speeds. " +
        "Do not use generic assistant speak. Do not mention code details, maintain retro-gamer style.";

      let prompt = `Level: ${levelName}, Current Score: ${score}, Personal Highscore: ${highscore}, AI Autoplay Mode: ${aiAutoplay ? "ENABLED" : "DISABLED"}. `;

      if (customQuestion) {
        prompt += `The player typed a direct query to you: "${customQuestion}". Answer them directly, with retro-gaming flair!`;
      } else if (event === "start") {
        prompt += "Player just started the game.";
      } else if (event === "eat") {
        prompt += `Snake just ate a byte of data! Score increased to ${score}.`;
      } else if (event === "level_up") {
        prompt += `Player completed the level and advanced to a new difficulty arena!`;
      } else if (event === "die") {
        prompt += `Crash! Game over. Final score reached is ${score}. Encourage them to retry or use AI Autoplay.`;
      } else if (event === "ai_on") {
        prompt += "AI Autoplay has been enabled. The pathfinding heuristic BFS bot was activated to play on behalf of humans.";
      } else if (event === "ai_off") {
        prompt += "AI Autoplay disabled. Human has taken manual hardware control back.";
      } else {
        prompt += "Give general tactical advice for playing snake.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      res.json({ commentary: response.text || "Scanning grid..." });
    } catch (err) {
      console.error(err);
      res.json({ commentary: "Data link established. Secure your grid lines, player!" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
