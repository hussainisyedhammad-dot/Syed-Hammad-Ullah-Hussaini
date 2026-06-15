import React, { useState } from "react";
import { Faction, StructureType } from "../types";
import { Sparkles, Hammer, Zap, Landmark, ShieldAlert, Swords, Trash2, Disc } from "lucide-react";

interface GameSettingsProps {
  playerFaction: Faction;
  onChangeFaction: (fac: Faction) => void;
  opponentFaction: Faction;
  onChangeOpponentFaction: (fac: Faction) => void;
  credits: number;
  powerGenerated: number;
  powerUsed: number;
  activeBuilding: StructureType | null;
  onSelectBuildingToPlace: (type: StructureType | null) => void;
  spawnUnit: (unitType: string) => void;
  onGenerateCustomSkirmish: (prompt: string) => void;
  isGeneratingSkirmish: boolean;
  onTriggerSellMode: () => void;
  isSellMode: boolean;
}

export default function GameSettings({
  playerFaction,
  onChangeFaction,
  opponentFaction,
  onChangeOpponentFaction,
  credits,
  powerGenerated,
  powerUsed,
  activeBuilding,
  onSelectBuildingToPlace,
  spawnUnit,
  onGenerateCustomSkirmish,
  isGeneratingSkirmish,
  onTriggerSellMode,
  isSellMode,
}: GameSettingsProps) {
  const [customPrompt, setCustomPrompt] = useState("");

  // Faction weapon configurations
  const weaponsByFaction = {
    USA: [
      { id: "CRUSADER", name: "Crusader Tank", cost: 900, desc: "Sleek armor + dynamic laser defense point shield" },
      { id: "HUMVEE", name: "Combat Humvee", cost: 700, desc: "Rapid light patrol buggy. Outranges infantry easily" },
      { id: "COMANCHE", name: "Comanche Copter", cost: 1200, desc: "Hover gunship fires heat-seeking anti-armor rockets" },
      { id: "AURORA", name: "Aurora Bomber", cost: 2000, desc: "Hypersonic plane. Drop high-yield bombs invulnerably" }
    ],
    CHINA: [
      { id: "BATTLEMASTER", name: "Battlemaster", cost: 800, desc: "Traditional steel tank. Hits sturdy and cheap" },
      { id: "DRAGON_TANK", name: "Dragon Tank", cost: 800, desc: "Napalm flame thrower weapon. Melts base structures" },
      { id: "GATLING_TANK", name: "Gatling Tank", cost: 900, desc: "Rapid 3-barrel gun accelerates shreds infantry/helicopters" },
      { id: "OVERLORD", name: "Overlord Tank", cost: 2000, desc: "Colossal bunker tank with mounted Gatling cannon top" }
    ],
    GLA: [
      { id: "SCORPION", name: "Scorpion Tank", cost: 700, desc: "Light fast buggy fitted with toxic Anthrax artillery" },
      { id: "MARAUDER", name: "Marauder Tank", cost: 900, desc: "Heavy tank upgrades turret dual cannons upon battle scrap kills" },
      { id: "TECHNICAL", name: "Combat Tech", cost: 500, desc: "Super speedy scrap truck to infiltrate and ambush bases" },
      { id: "QUAD_CANNON", name: "Quad Cannon", cost: 850, desc: "Devastating anti-air four-barrel tracer heavy gun bullets" }
    ]
  };

  const structuresByFaction = [
    { type: "POWER_PLANT" as StructureType, name: "Fusion Reactor", cost: 800, desc: "Generates Grid electricity (+70 Power)", logo: Zap },
    { type: "SUPPLY_CENTER" as StructureType, name: "Supply Dock Depot", cost: 1500, desc: "Spawns automated harvesters to gather credits", logo: Landmark },
    { type: "WAR_FACTORY" as StructureType, name: "War Armor Yard", cost: 2000, desc: "Enables production of heavy country tank units", logo: Hammer },
    { type: "DEFENSE_TURRET" as StructureType, name: "Static Defense Post", cost: 1000, desc: "Auto shoots rockets/rotary bullets at incoming hostiles", logo: ShieldAlert },
    { type: "SUPERWEAPON" as StructureType, name: "Doomsday Weapon Site", cost: 5000, desc: "Enables fatal catastrophic orbital nuclear strike", logo: Swords }
  ];

  const handleSkirmishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isGeneratingSkirmish) return;
    onGenerateCustomSkirmish(customPrompt);
  };

  const getFactionTextColor = (fac: Faction) => {
    switch (fac) {
      case "USA": return "text-cyan-400";
      case "CHINA": return "text-rose-400";
      case "GLA": return "text-emerald-400";
    }
  };

  return (
    <div className="space-y-5 select-none bg-[#0a0f18]/40 p-5 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-md relative">
      <div className="absolute top-0 right-10 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Choice of Country */}
      <div>
        <h3 className="text-[10px] font-mono font-bold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
          <Landmark className="w-3.5 h-3.5 text-cyan-400" /> SELECT FACTION HEADQUARTERS
        </h3>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {(["USA", "CHINA", "GLA"] as Faction[]).map((fac) => (
            <button
              key={fac}
              onClick={() => onChangeFaction(fac)}
              className={`py-2 px-1 rounded-lg border font-black transition-all cursor-pointer text-center ${
                playerFaction === fac
                  ? fac === "USA"
                    ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                    : fac === "CHINA"
                    ? "bg-rose-950/50 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                    : "bg-emerald-950/50 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-350"
              }`}
            >
              {fac}
            </button>
          ))}
        </div>
      </div>

      {/* Choice of Opponent Country */}
      <div>
        <h3 className="text-[10px] font-mono font-bold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
          <Swords className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> EMULATED AI OPPONENT FACTION
        </h3>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {(["USA", "CHINA", "GLA"] as Faction[]).map((fac) => (
            <button
              key={fac}
              onClick={() => onChangeOpponentFaction(fac)}
              className={`py-2 px-1 rounded-lg border font-black transition-all cursor-pointer text-center ${
                opponentFaction === fac
                  ? fac === "USA"
                    ? "bg-cyan-950/20 border-cyan-700/65 text-cyan-300"
                    : fac === "CHINA"
                    ? "bg-rose-950/20 border-rose-700/65 text-rose-300"
                    : "bg-emerald-950/20 border-emerald-700/65 text-emerald-300"
                  : "bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400"
              }`}
            >
              {fac}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Power status (except GLA which is power independent!) */}
      {playerFaction !== "GLA" && (
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 uppercase tracking-wider">GRID ENERGY GRID</span>
            <span className={`text-[10px] font-bold ${powerGenerated < powerUsed ? "text-rose-500" : "text-cyan-400"}`}>
              {powerUsed}/{powerGenerated} kW
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                powerGenerated < powerUsed 
                  ? "bg-rose-500 animate-pulse" 
                  : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              }`}
              style={{ width: `${Math.min(100, powerGenerated > 0 ? (powerUsed / powerGenerated) * 100 : 100)}%` }}
            />
          </div>
          {powerGenerated < powerUsed && (
            <p className="text-[8px] text-rose-400 leading-normal animate-pulse uppercase max-w-xs">
              ⚠️ POWER CRITICAL: Units production queues are slowed by 60%! Build Fusion Reactor!
            </p>
          )}
        </div>
      )}

      {/* Base Building Queue */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
            <Hammer className="w-3.5 h-3.5 text-cyan-400" /> BASE ARCHITECTURE CONDUITS
          </h3>
          <button
            onClick={onTriggerSellMode}
            className={`px-2 py-0.5 border font-mono text-[8px] uppercase tracking-wider rounded transition-all cursor-pointer ${
              isSellMode 
                ? "bg-rose-950 border-rose-500 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]" 
                : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            Sell Site
          </button>
        </div>
        
        <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-1">
          {structuresByFaction
            .filter(st => {
              if (playerFaction === "GLA" && st.type === "POWER_PLANT") return false; // GLA doesn't need power!
              return true;
            })
            .map((st) => {
              const isActive = activeBuilding === st.type;
              const isAffordable = credits >= st.cost;
              return (
                <button
                  key={st.type}
                  disabled={!isAffordable && !isActive}
                  onClick={() => onSelectBuildingToPlace(isActive ? null : st.type)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left font-mono transition-all ${
                    isActive
                      ? "bg-cyan-950/30 border-cyan-500 text-cyan-200"
                      : isAffordable
                      ? "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-700/80 hover:bg-[#0a0f18]/30 cursor-pointer"
                      : "bg-slate-950/20 border-slate-900/40 text-slate-500 opacity-55"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[80%]">
                    <st.logo className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <div className="truncate">
                      <p className="text-[10px] font-bold leading-none">{st.name}</p>
                      <p className="text-[8px] text-slate-500 truncate leading-snug mt-0.5">{st.desc}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold shrink-0 ${isActive ? "text-cyan-400" : isAffordable ? "text-emerald-400" : "text-slate-500"}`}>
                    ${st.cost}
                  </span>
                </button>
              );
            })}
        </div>
        {activeBuilding && (
          <p className="text-[8px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 p-2 mt-2 rounded-lg animate-pulse leading-normal uppercase">
            👉 SELECT DESIRED GRID PORT: Click on your left base zone (left 45% of map) to spawn and construct the selected structure!
          </p>
        )}
      </div>

      {/* Combat Units Arsenal */}
      <div>
        <h3 className="text-[10px] font-mono font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
          <Swords className="w-3.5 h-3.5 text-cyan-400" /> PRODUCE MILITARY ARSENAL
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {weaponsByFaction[playerFaction].map((weap) => {
            const isAffordable = credits >= weap.cost;
            return (
              <button
                key={weap.id}
                disabled={!isAffordable}
                onClick={() => spawnUnit(weap.id)}
                className={`flex flex-col p-2 rounded-xl border font-mono text-left transition-all ${
                  isAffordable
                    ? "bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-[#0a0f18]/30 text-slate-350 cursor-pointer"
                    : "bg-slate-950/25 border-slate-900/40 text-slate-500 opacity-55 cursor-not-allowed"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-slate-200 truncate pr-1">{weap.name}</span>
                  <span className={`text-[9px] font-bold shrink-0 ${isAffordable ? "text-emerald-400" : "text-slate-500"}`}>
                    ${weap.cost}
                  </span>
                </div>
                <span className="text-[7.5px] text-slate-500 leading-snug mt-1 truncate w-full">{weap.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skirmish Map Procedural Generator */}
      <div className="p-3.5 bg-gradient-to-br from-[#0a0f18]/80 to-[#05070a]/80 border border-slate-800/80 rounded-xl space-y-3.5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/5 blur-[50px] pointer-events-none" />

        <div className="flex items-center gap-2 relative">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider block">Procedural Map Builder</span>
            <span className="text-[8px] font-mono text-slate-500 uppercase leading-none mt-0.5 block">AI CO-CREATOR CHIP</span>
          </div>
        </div>

        <form onSubmit={handleSkirmishSubmit} className="space-y-2 relative">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. chemical wasteland, snow outpost..."
            disabled={isGeneratingSkirmish}
            className="w-full bg-[#05070a] font-mono text-[10px] text-slate-200 border border-slate-800 rounded-lg px-2.5 py-2 placeholder-slate-600 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={isGeneratingSkirmish || !customPrompt.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 py-1.5 rounded-lg font-mono text-[9px] font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50 text-center cursor-pointer shadow-[0_0_15px_rgba(8,145,178,0.2)]"
          >
            {isGeneratingSkirmish ? (
              <>
                <Disc className="w-3 h-3 animate-spin" /> GENERATING MAP THEME...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> COMPILE THEATER CONFIG
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
