import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Faction } from "../types";
import { Send, Terminal, Shield, Cpu, HelpCircle, Radio, Disc } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GeneralCommandConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  playerFaction: Faction;
  opponentFaction: Faction;
  matchStats: {
    credits: number;
    kills: number;
    losses: number;
  };
}

export default function GeneralCommandConsole({
  messages,
  onSendMessage,
  isLoading,
  playerFaction,
  opponentFaction,
  matchStats,
}: GeneralCommandConsoleProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const presetQuestions = [
    `Tips for ${playerFaction} versus ${opponentFaction}?`,
    `How do I launch the Superweapon?`,
    `USA, China, or GLA is best?`,
    `Is that Anthrax Dr. Thrax?`,
  ];

  const getFactionColor = (fac: Faction) => {
    switch (fac) {
      case "USA": return "text-cyan-400 border-cyan-800/50 bg-cyan-950/20";
      case "CHINA": return "text-rose-400 border-rose-800/50 bg-rose-950/20";
      case "GLA": return "text-emerald-400 border-emerald-800/50 bg-emerald-950/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f18]/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      {/* Header */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800/65 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-semibold text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
              RADIO COMMAND LINK
            </h3>
            <p className="text-[9px] font-mono text-slate-500 uppercase">Interactive Banter Network</p>
          </div>
        </div>

        {/* General Opponent Banner */}
        <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-full font-mono text-[9px] uppercase font-bold tracking-wider ${getFactionColor(opponentFaction)}`}>
          <Disc className="w-3 h-3 animate-spin text-inherit shrink-0" />
          <span>OPPONENT: {opponentFaction}</span>
        </div>
      </div>

      {/* Telemetry stats summary */}
      <div className="grid grid-cols-3 gap-1 px-4 py-2 bg-slate-950/40 border-b border-slate-800/40 font-mono text-[9px] text-slate-500 uppercase tracking-wider">
        <div>
          CREDITS: <span className="text-emerald-400 font-bold">${matchStats.credits}</span>
        </div>
        <div className="text-center">
          KILLS: <span className="text-cyan-400 font-bold">{matchStats.kills}</span>
        </div>
        <div className="text-right">
          LOSSES: <span className="text-rose-504 font-bold text-rose-400">{matchStats.losses}</span>
        </div>
      </div>

      {/* Transmission Feed log */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[300px] select-none scrollbar-thin scrollbar-thumb-slate-800">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isPlayer = msg.sender === "player";
            const isEnemy = msg.sender === "enemy_general";
            const isAdvisor = msg.sender === "advisor";
            
            let nameBubbleColor = "bg-slate-800 text-slate-300";
            let contentStyle = "bg-slate-900/40 text-slate-300 border-slate-800";
            
            if (isPlayer) {
              nameBubbleColor = `bg-cyan-950/70 text-cyan-400 border-cyan-800/50`;
              contentStyle = "bg-cyan-950/15 text-cyan-100 border-cyan-900/40";
            } else if (isEnemy) {
              const facColor = opponentFaction === "CHINA" ? "bg-rose-950/70 border-rose-800/50 text-rose-400" : opponentFaction === "GLA" ? "bg-emerald-950/70 border-emerald-800/50 text-emerald-400" : "bg-cyan-950/70 border-cyan-800/50 text-cyan-400";
              nameBubbleColor = facColor;
              contentStyle = opponentFaction === "CHINA" ? "bg-rose-950/10 text-rose-100 border-rose-900/30" : opponentFaction === "GLA" ? "bg-emerald-950/10 text-emerald-100 border-emerald-900/30" : "bg-cyan-950/10 text-cyan-100 border-cyan-900/30";
            } else if (isAdvisor) {
              nameBubbleColor = "bg-amber-950 text-amber-400 border-amber-800";
              contentStyle = "bg-amber-950/10 text-amber-100 border-amber-900/30";
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 max-w-[90%] ${isPlayer ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Visual faction avatar sphere */}
                <div className={`w-8 h-8 rounded-lg border font-mono text-[10px] flex items-center justify-center shrink-0 uppercase font-black ${nameBubbleColor}`}>
                  {isPlayer ? playerFaction[0] : isEnemy ? opponentFaction[0] : "HQ"}
                </div>

                <div className="flex flex-col">
                  {/* Sender Name label */}
                  <span className="text-[8px] font-mono uppercase text-slate-500 tracking-wider mb-0.5 px-0.5">
                    {msg.senderName}
                  </span>
                  {/* Comm body block */}
                  <div className={`p-2.5 rounded-xl font-mono text-[11px] leading-relaxed border ${contentStyle}`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/20 border border-cyan-800/20 flex items-center justify-center shrink-0 text-cyan-500">
              <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            </div>
            <div className="bg-slate-900/20 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Preset Prompt Suggestions */}
      <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800/60">
        <p className="text-[8px] font-mono text-slate-500 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
          <HelpCircle className="w-3 h-3 text-cyan-500" /> Tactical Comm Suggestion
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => onSendMessage(q)}
              className="text-[9px] font-mono bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 px-2 py-1 rounded transition-all duration-150 text-left shrink-0 max-w-full truncate disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950/60 border-t border-slate-800/60 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLoading ? "Accessing radio link..." : "Threaten or ask enemy General..."}
          disabled={isLoading}
          className="flex-1 bg-[#05070a] font-mono text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30 placeholder-slate-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 p-2.5 rounded-xl transition-all font-mono font-bold flex items-center justify-center shrink-0 disabled:opacity-50 shadow-[0_0_15px_rgba(8,145,178,0.25)] cursor-pointer"
        >
          <Send className="w-4 h-4 text-slate-950" />
        </button>
      </form>
    </div>
  );
}
