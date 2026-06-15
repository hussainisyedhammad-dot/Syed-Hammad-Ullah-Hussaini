import React, { useState } from "react";
import { Level } from "../types";
import { Sparkles, Play, ToggleLeft, ToggleRight, Info, AlertTriangle, ArrowRight, Layers, Sliders } from "lucide-react";

interface GameSettingsProps {
  levels: Level[];
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
  onGenerateCustomLevel: (prompt: string) => void;
  isGeneratingLevel: boolean;
  aiAutoplay: boolean;
  setAiAutoplay: (val: boolean) => void;
  speedMultiplier: number; // For extra control (default 1)
  setSpeedMultiplier: (val: number) => void;
}

export default function GameSettings({
  levels,
  currentLevelIndex,
  onSelectLevel,
  onGenerateCustomLevel,
  isGeneratingLevel,
  aiAutoplay,
  setAiAutoplay,
  speedMultiplier,
  setSpeedMultiplier,
}: GameSettingsProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isGeneratingLevel) return;
    onGenerateCustomLevel(customPrompt);
    setCustomPrompt("");
  };

  const selectedLevel = levels[currentLevelIndex];

  // Helper mapping theme colors to tailwind style sets
  const themeDict: Record<string, { bg: string; text: string; lightbg: string; ring: string }> = {
    green: { bg: "bg-emerald-500", text: "text-emerald-400", lightbg: "bg-emerald-900/10", ring: "ring-emerald-500/20" },
    emerald: { bg: "bg-emerald-500", text: "text-emerald-400", lightbg: "bg-emerald-900/10", ring: "ring-emerald-500/20" },
    sky: { bg: "bg-sky-500", text: "text-sky-400", lightbg: "bg-sky-900/10", ring: "ring-sky-500/20" },
    purple: { bg: "bg-purple-500", text: "text-purple-400", lightbg: "bg-purple-900/10", ring: "ring-purple-500/20" },
    rose: { bg: "bg-rose-500", text: "text-rose-400", lightbg: "bg-rose-900/10", ring: "ring-rose-500/20" },
    amber: { bg: "bg-amber-500", text: "text-amber-400", lightbg: "bg-amber-900/10", ring: "ring-amber-500/20" },
    indigo: { bg: "bg-indigo-500", text: "text-indigo-400", lightbg: "bg-indigo-900/10", ring: "ring-indigo-500/20" },
    violet: { bg: "bg-violet-500", text: "text-violet-400", lightbg: "bg-violet-900/10", ring: "ring-violet-500/20" },
    cyan: { bg: "bg-cyan-500", text: "text-cyan-400", lightbg: "bg-cyan-900/10", ring: "ring-cyan-500/20" },
    lime: { bg: "bg-lime-500", text: "text-lime-400", lightbg: "bg-lime-900/10", ring: "ring-lime-500/20" },
  };

  const getThemeColors = (color: string) => {
    return themeDict[color] || themeDict.green;
  };

  const currentColors = getThemeColors(selectedLevel?.colorTheme || "green");

  return (
    <div className="space-y-6 select-none bg-slate-900/40 p-6 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-md relative">
      <div className="absolute top-0 right-10 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/55 to-transparent" />

      {/* Speed & Autoplay Logic */}
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
          <Sliders className="w-4 h-4 text-cyan-500" /> SYSTEM CONTROL LABELS
        </h3>
        
        <div className="space-y-4">
          {/* AI Autoplay Switcher */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-bold text-slate-200">AI CO-PILOT SOLVER</span>
              <p className="text-[10px] font-mono text-slate-500 leading-normal">
                Heuristic BFS pathfinder takes total hardware controls. Live path visualizer activates.
              </p>
            </div>
            <button
              onClick={() => setAiAutoplay(!aiAutoplay)}
              className="focus:outline-none focus:ring-1 focus:ring-cyan-500/30 rounded"
              id="ai-copilot-toggle"
            >
              {aiAutoplay ? (
                <ToggleRight className="w-10 h-10 text-cyan-400 cursor-pointer" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-600 cursor-pointer" />
              )}
            </button>
          </div>

          {/* Speed Multiplier slider */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-slate-200">VELOCITY RATIO multiplier</span>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/35 border border-cyan-800/30 px-2 py-0.5 rounded">
                x{speedMultiplier.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              id="velocity-slider"
            />
            <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-tight">
              <span>Hyper-Precision (Slow)</span>
              <span>Nominal Speed</span>
              <span>Neuro-Reflex (Fast)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Level List */}
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-widest">
          <Layers className="w-4 h-4 text-cyan-500" /> ARCHITECTURAL PATHWAYS
        </h3>
        
        <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {levels.map((lvl, index) => {
            const isSelected = index === currentLevelIndex;
            const colors = getThemeColors(lvl.colorTheme);
            return (
              <button
                key={lvl.id}
                onClick={() => onSelectLevel(index)}
                className={`flex items-center justify-between p-3 rounded-xl border font-mono text-left transition-all ${
                  isSelected
                    ? "bg-[#0a0f18]/80 border-slate-700 shadow-md ring-1 ring-cyan-500/20"
                    : "bg-slate-950/20 border-slate-900 text-slate-400 hover:border-slate-800/60 hover:bg-[#0a0f18]/40"
                }`}
              >
                <div className="space-y-1 truncate max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${colors.bg} shadow-[0_0_8px_rgba(34,211,238,0.4)]`}
                    />
                    <span className={`text-xs font-bold ${isSelected ? "text-slate-100" : "text-slate-400"}`}>
                      {lvl.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate leading-relaxed">
                    {lvl.description}
                  </p>
                </div>

                <div className="shrink-0 text-[10px] text-right">
                  <span className={`${colors.text} font-bold`}>
                    {(lvl.speed / speedMultiplier).toFixed(0)}ms
                  </span>
                  <div className="text-[9px] text-slate-600">TGT:{lvl.targetScore}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Level Creator generator */}
      <div className="p-4 bg-gradient-to-br from-[#0a0f18] to-[#05070a] border border-slate-800 rounded-xl space-y-4 relative overflow-hidden">
        {/* Glowing aura background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/5 blur-[50px] pointer-events-none" />

        <div className="flex items-center gap-2 relative">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h4 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            GEMINI ARENA ARCHITECT
          </h4>
        </div>

        <p className="text-[10px] font-mono text-slate-400 leading-normal relative">
          Draft a custom prompt description (e.g. <span className="text-cyan-400">"a castle fort"</span>, <span className="text-cyan-400">"the capital H shape"</span>, or <span className="text-cyan-400">"dense pixel columns"</span>) and Gemini will build a custom obstacle arena, complete with curated speeds and colour keys.
        </p>

        <form onSubmit={handleCustomSubmit} className="space-y-2.5 relative">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. diagonal checkerboard..."
            disabled={isGeneratingLevel}
            className="w-full bg-[#05070a] font-mono text-xs text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 placeholder-slate-600 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGeneratingLevel || !customPrompt.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 text-center cursor-pointer shadow-[0_0_15px_rgba(8,145,178,0.2)]"
          >
            {isGeneratingLevel ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                DRAFTING GRID CHANNELS...
              </>
            ) : (
              <>
                BUILD CUSTOM ARENA <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* General Tips box */}
      <div className="flex gap-2.5 p-3 bg-slate-950/20 border border-slate-900/60 rounded-xl">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-[10px] font-mono text-slate-500 leading-normal">
          Use the keyboard arrow keys or WASD to move the snake manually. If things get too rapid, activate the AI Co-Pilot!
        </p>
      </div>
    </div>
  );
}
