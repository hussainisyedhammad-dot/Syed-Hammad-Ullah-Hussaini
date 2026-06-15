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

  // API Route for procedural battlefield/level design
  app.post("/api/generate-skirmish", async (req, res) => {
    try {
      const { prompt } = req.body;
      const userPrompt = prompt || "rugged desert badlands with oil derrick hazards";

      const promptString = `Design a procedural skirmish map layout for a Command & Conquer RTS match. Player is on the left side, AI is on the right side.
Style Request: "${userPrompt}". 
Provide:
1. Map Name: a bold military name.
2. Atmosphere: a brief description of the weather and terrain hazards.
3. Terrain Theme: one of "DESERT", "SNOW", "URBAN", "TOXIC_WASTELAND", "TEMPERATE".
4. Color scheme (primary hue values for landscape and radar).
5. Battlefield hazards / Obstacles: A list of coordinate coordinate zones: x (0 to 100), y (0 to 100), radius (representing ruins, rivers, oil derricks, or debris).
6. Recommended Supply Dock locations: A list of coordinates (x, y) where Supply centers should harvest. Ensure docks are placed in contesting middle or base zones (e.g. {x: 50, y: 50} for middle, {x: 20, y: 30} for player, {x: 80, y: 70} for enemy).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptString,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mapName: { type: Type.STRING, description: "Official military designation name of the theater" },
              atmosphere: { type: Type.STRING, description: "Tactical weather and hazards brief" },
              terrainTheme: { type: Type.STRING, description: "RTS biome type" },
              primaryColor: { type: Type.STRING, description: "HEX color or primary Tailwind class for grid accents (e.g. '#e2ba7e' for desert sand)" },
              hazards: {
                type: Type.ARRAY,
                description: "Array of passive obstacles / terrain ruins",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.INTEGER, description: "Horizontal center (0 to 100)" },
                    y: { type: Type.INTEGER, description: "Vertical center (0 to 100)" },
                    r: { type: Type.INTEGER, description: "Radius of blockage zone (5 to 15)" },
                    label: { type: Type.STRING, description: "Name of terrain blocker (e.g. 'Destroyed Bunker', 'Toxic Spill', 'Oil Derrick')" }
                  },
                  required: ["x", "y", "r", "label"]
                }
              },
              supplyDocks: {
                type: Type.ARRAY,
                description: "Map resource zones containing crates or oil",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.INTEGER, description: "X position (15 to 85)" },
                    y: { type: Type.INTEGER, description: "Y position (15 to 85)" },
                    amount: { type: Type.INTEGER, description: "Credits amount (通常 5000 to 15000)" }
                  },
                  required: ["x", "y", "amount"]
                }
              }
            },
            required: ["mapName", "atmosphere", "terrainTheme", "primaryColor", "hazards", "supplyDocks"]
          }
        }
      });

      const mapData = JSON.parse(response.text || "{}");
      res.json(mapData);
    } catch (err: any) {
      console.error("Error generating skirmish map:", err);
      // Perfect fallback map
      res.json({
        mapName: "Tournament Desert",
        atmosphere: "Arid landscape with sandstorm warning. Highly active lanes with high-ground choke points.",
        terrainTheme: "DESERT",
        primaryColor: "#d97706",
        hazards: [
          { x: 50, y: 50, r: 10, label: "Oil Derrick Outpost" },
          { x: 30, y: 70, r: 8, label: "Tiberium/Toxic Pool" },
          { x: 70, y: 30, r: 8, label: "Rock Barriers" }
        ],
        supplyDocks: [
          { x: 20, y: 25, amount: 8000 },
          { x: 80, y: 75, amount: 8000 },
          { x: 50, y: 50, amount: 15000 }
        ]
      });
    }
  });

  // API Route for radio transmissions with GLA, USA, and China Generals
  app.post("/api/commentary", async (req, res) => {
    try {
      const { playerFaction, opponentFaction, credits, kills, losses, event, chatQuestion } = req.body;

      // Establish character prompts
      const characterPrompts: Record<string, string> = {
        USA: "General Granger, the high-tech USA Air Force Commander. He speaks with extreme military discipline, relying on lasers, drones, air superiority, and supreme rules of engagement. Secure, proud, technological, slightly condescending towards GLA.",
        CHINA: "General Tsing Shi Tao, the Nuclear armor Tactician from China. He is aggressive, patriotic, talks about China's massive nuclear tanks, nationalistic pride, propaganda towers, and burning enemy locations down in radioactive fire.",
        GLA: "Dr. Thrax, the GLA bio-weapon specialist. He is delightfully maniacal, speaks with a chaotic, toxic accent, loves chemical weapons (Anthrax-Beta!), tunnels, ambush strategies, scraps, and hates high-tech radar arrays."
      };

      const systemInstruction = `You are a legendary RTS opponent AI General from Command & Conquer Generals: Zero Hour.
Our player represents ${playerFaction}. The AI opponent represents ${opponentFaction}.
You will speak as either the ADVISOR, the PLAYER'S GENERAL, or the ENEMY OPPONENT GENERAL depending on the event context.
Character details for each faction General:
- USA: ${characterPrompts.USA}
- CHINA: ${characterPrompts.CHINA}
- GLA: ${characterPrompts.GLA}

Keep your replies extremely short, punchy, atmospheric, and military-oriented (under 30 words).
Inject classic quotes, references (supply docks, build queues, Patriot missiles, Overlord speaker towers, Scud storms, Anthrax, Particle beams, power levels).
Do not use generic assistance phrases. Stay 100% in-character.`;

      let prompt = `Game context: Player Faction is ${playerFaction}, Opponent is ${opponentFaction}. Credits: $${credits}. Combat Stats: ${kills} Kills, ${losses} losses. `;

      if (chatQuestion) {
        prompt += `The player has sent a direct tactical question over the comm links. It reads: "${chatQuestion}". Answer as the ENEMY General ${opponentFaction} taunting/reacting to them, or as your own commander advising them.`;
      } else {
        switch (event) {
          case "start":
            prompt += `Battle is beginning on the skirmish line! Introduce yourself as the enemy faction ${opponentFaction} commander and issue an intimidating or confident opening warning to the player.`;
            break;
          case "superweapon_launch":
            prompt += `CRITICAL: The Player has launched their devastating superweapon (Particle Cannon / Nuclear Missile / Scud Storm)! Answer in pure panic or defiant anger as General of ${opponentFaction}`;
            break;
          case "superweapon_enemy_launch":
            prompt += `TACTICAL ACTION: The enemy General (${opponentFaction}) has launched their superweapon at the player! Deliver a triumphant, villainous taunt.`;
            break;
          case "player_unit_died":
            prompt += `A unit of the player's Army was shredded by your defenses. Deliver a short, mocking tactical taunt.`;
            break;
          case "build_structure":
            prompt += `The player just completed a major base structure. Gibe them about their strategy or highlight your superior faction blueprints.`;
            break;
          case "radiation_spread":
            prompt += `Chemical gas or green nuclear fallout is active in the grid. Deliver a toxic or scientific commentary.`;
            break;
          case "victory":
            prompt += `The player defeated your base! Deliver a defeated but threatening retreat voice line.`;
            break;
          case "defeat":
            prompt += `You crushed the player's Command Center! Give an ultimate victory speech.`;
            break;
          default:
            prompt += `Provide a random battle banter or tactical advice relative to the current skirmish.`;
            break;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      res.json({ commentary: response.text || "Visual interface online, commander." });
    } catch (err) {
      console.error(err);
      res.json({ commentary: "Secure transmission online. Maintain combat focus, General!" });
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
    console.log(`C&C Generals Server running on http://localhost:${PORT}`);
  });
}

startServer();
