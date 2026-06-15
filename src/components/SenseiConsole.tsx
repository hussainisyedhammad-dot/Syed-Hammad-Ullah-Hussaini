import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Terminal, Shield, Cpu, Sparkles, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SenseiConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  aiAutoplay: boolean;
  currentLevelName: string;
  gameScore: number;
  highScore: number;
}

export default function SenseiConsole({
  messages,
  onSendMessage,
  isLoading,
  aiAutoplay,
  currentLevelName,
  gameScore,
  highScore,
}: SenseiConsoleProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
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
    "What is your algorithm?",
    "Give me tips for Level 3",
    "How does AI Autoplay work?",
    "Is this snake self-aware?",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/20 backdrop-blur-md relative">
      {/* Laser line effect decoration */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent" />

      {/* Header */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800/65 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold text-slate-150 uppercase tracking-widest">
              AI SENSEI COACH
            </h3>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Firmware v1.35b</p>
          </div>
        </div>

        {/* AI Engine Status Light */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#05070a]/80 border border-slate-800/60 rounded-full">
          <Cpu className={`w-3.5 h-3.5 ${aiAutoplay ? "text-cyan-400 animate-spin" : "text-slate-500"}`} />
          <span className="font-mono text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            {aiAutoplay ? "AI Active" : "Human Core"}
          </span>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-3 gap-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
        <div>
          LOC: <span className="text-slate-200">{currentLevelName}</span>
        </div>
        <div className="text-center">
          SCORE: <span className="text-cyan-400 font-bold">{gameScore}</span>
        </div>
        <div className="text-right">
          MAX: <span className="text-amber-400 font-bold">{highScore}</span>
        </div>
      </div>

      {/* Chat logs */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[190px] select-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isSensei = msg.sender === "sensei";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 max-w-[85%] ${isSensei ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-700/55 ${
                    isSensei ? "bg-cyan-900/40 text-cyan-400" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {isSensei ? <Cpu className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </div>

                {/* Message Cloud */}
                <div className="flex flex-col">
                  <div
                    className={`p-3 rounded-xl font-mono text-xs leading-relaxed border ${
                      isSensei
                        ? "bg-slate-900/40 text-cyan-300 border-cyan-900/40 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                        : "bg-slate-800/80 text-slate-200 border-slate-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1 px-1 self-start">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-[85%] mr-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-950/20 border border-cyan-800/20 flex items-center justify-center shrink-0 text-cyan-500">
              <Cpu className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900/30 border border-slate-850 p-3 rounded-xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Preset Questions Slider */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60">
        <p className="text-[9px] font-mono text-slate-500 mb-1.5 flex items-center gap-1 uppercase tracking-wider">
          <HelpCircle className="w-3 h-3 text-cyan-500" /> Neural Query Suggestions
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => onSendMessage(q)}
              className="text-[10px] font-mono bg-[#0a0f18]/90 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 px-2.5 py-1 rounded transition-all duration-150 text-left shrink-0 max-w-full truncate disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat input box */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950/40 border-t border-slate-800/60 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLoading ? "Analyzing..." : "Ask Sensei something..."}
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
