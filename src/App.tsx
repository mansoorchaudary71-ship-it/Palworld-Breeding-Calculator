
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Repeat, Users, Info, PawPrint, Sparkles, X, RotateCcw, Moon, Sun, Share2, Link as LinkIcon, MessageCircle, Twitter, Facebook, Check, Hexagon, Route, ArrowRight, Shield, Heart, Sword, Briefcase, Package, Star } from 'lucide-react';
import { palDatabase as PALS, specialCombinations } from './data.js';

export interface Pal {
  id?: string;
  name: string;
  power: number;
  image?: string;
  elements?: string[];
  rarity?: string;
  trait?: string;
  weaknesses?: string[];
  paldexEntry?: string;
  stats?: {
    hp: number;
    attack: { melee: number; ranged: number };
    defense: number;
    speed: { ride: number; run: number; walk: number };
    stamina: number;
    support: number;
    food: number;
  };
  suitability?: Array<{
    type: string;
    image: string;
    level: number;
  }>;
  aura?: {
    name: string;
    description: string;
    tech: string | null;
  } | null;
  drops?: string[];
}

const getImageUrl = (image?: string) => {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  return `./${image.replace(/^\//, '')}`;
};

// Convert the linear special combinations array into a fast lookup map
const SPECIAL_RECIPES: Record<string, string> = {};
specialCombinations.forEach(combo => {
  SPECIAL_RECIPES[`${combo.parentA}+${combo.parentB}`] = combo.result;
  SPECIAL_RECIPES[`${combo.parentB}+${combo.parentA}`] = combo.result; // Bidirectional
});

const ELEMENT_COLORS: Record<string, string> = {
  Neutral: 'bg-stone-500/20 text-stone-700 dark:text-stone-300 border-stone-500/30',
  Grass: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  Fire: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  Water: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  Electric: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  Ice: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  Ground: 'bg-amber-600/20 text-amber-700 dark:text-amber-300 border-amber-600/30',
  Dark: 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-600/30',
  Dragon: 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border-indigo-600/30',
};

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-stone-600 dark:text-stone-400',
  Rare: 'text-blue-600 dark:text-blue-400',
  Epic: 'text-purple-600 dark:text-purple-400',
  Legendary: 'text-orange-600 dark:text-orange-400',
};

export const calculateResult = (pA: Pal, pB: Pal) => {
  const comboKey1 = `${pA.name}+${pB.name}`;
  const comboKey2 = `${pB.name}+${pA.name}`;
  const specialName = SPECIAL_RECIPES[comboKey1] || SPECIAL_RECIPES[comboKey2];
  
  if (specialName) {
    return PALS.find(p => p.name === specialName) || null;
  }

  const targetPower = Math.floor((pA.power + pB.power + 1) / 2);
  let best = PALS[0];
  let minDiff = Math.abs(PALS[0].power - targetPower);

  for (const pal of PALS) {
    const diff = Math.abs(pal.power - targetPower);
    if (diff < minDiff) {
      minDiff = diff;
      best = pal;
    } else if (diff === minDiff) {
      if (pal.name < best.name) best = pal;
    }
  }
  return best;
};

export interface BreedingStep {
  p1: Pal;
  p2: Pal;
  result: Pal;
}

export const findBreedingPath = (targetPal: Pal, startingPal: Pal | null): BreedingStep[] | null => {
  if (startingPal && startingPal.name === targetPal.name) return [];
  
  const visited = new Set<string>();
  const queue: { currentPal: Pal, path: BreedingStep[] }[] = [];
  
  let allowedOthers = PALS;
  
  if (startingPal) {
    queue.push({ currentPal: startingPal, path: [] });
    visited.add(startingPal.name);
  } else {
    // Start from common pals to build up to target
    const commons = PALS.filter(p => p.rarity === 'Common');
    if (commons.some(c => c.name === targetPal.name)) return [];
    
    // If no commons exist with tag, try to fallback to first few
    if (commons.length === 0 && PALS.length > 0) commons.push(PALS[0]);
    
    commons.forEach(c => {
      queue.push({ currentPal: c, path: [] });
      visited.add(c.name);
    });
    
    allowedOthers = commons; // Use only common pals
  }

  const MAX_STEPS = 5;

  while (queue.length > 0) {
    const { currentPal, path } = queue.shift()!;
    
    if (path.length >= MAX_STEPS) continue; // Prune deep branches
    
    for (const other of allowedOthers) {
      const offspring = calculateResult(currentPal, other);
      if (offspring && !visited.has(offspring.name)) {
        visited.add(offspring.name);
        
        const newPath = [...path, { p1: currentPal, p2: other, result: offspring }];
        
        if (offspring.name === targetPal.name) {
          return newPath;
        }
        
        queue.push({ currentPal: offspring, path: newPath });
      }
    }
  }
  
  return null;
};

const ShareOption = ({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
      {icon}
    </div>
    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
  </button>
);

const SearchableSelect = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "Select a Pal..." 
}: { 
  label: string; 
  value: Pal | null; 
  onChange: (pal: Pal) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setElementFilter('');
      setRarityFilter('');
    }
  }, [isOpen]);

  const filteredPals = useMemo(() => {
    return PALS.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchElement = elementFilter ? p.elements?.includes(elementFilter) : true;
      const matchRarity = rarityFilter ? p.rarity === rarityFilter : true;
      return matchSearch && matchElement && matchRarity;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [search, elementFilter, rarityFilter]);

  const allElements = useMemo(() => Array.from(new Set(PALS.flatMap(p => p.elements || []))).sort(), []);
  const allRarities = useMemo(() => Array.from(new Set(PALS.map(p => p.rarity).filter(Boolean) as string[])).sort(), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 ml-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[3.5rem] py-2 px-4 flex items-center justify-between rounded-2xl glass hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 group shadow-sm"
      >
        <div className="flex flex-1 items-center gap-3 mr-3 overflow-hidden">
          {value ? (
            <>
              {value.image ? (
                <img src={getImageUrl(value.image)} referrerPolicy="no-referrer" alt={value.name} className="w-10 h-10 object-contain drop-shadow" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-xs text-slate-500 font-medium">{value.name.substring(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div className="flex flex-col items-start min-w-0">
                <div className="flex items-center gap-2 max-w-full">
                  <span className="text-slate-900 dark:text-white font-medium truncate">{value.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0">
                    {value.trait && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{value.trait}</span>}
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">PWR {value.power}</span>
                  </span>
                </div>
                {value.elements && value.elements.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {value.elements.map(element => (
                      <span key={element} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ELEMENT_COLORS[element] || ELEMENT_COLORS.Neutral}`}>
                        {element}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-500 font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 w-full mt-3 glass rounded-3xl overflow-hidden shadow-2xl p-4 border border-white/40 dark:border-white/10"
          >
            <div className="flex flex-col gap-3 mb-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search pals..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 ring-blue-500/50 text-sm transition-all shadow-inner"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                <select
                  value={elementFilter}
                  onChange={(e) => setElementFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-2 ring-blue-500/50 text-xs font-medium cursor-pointer"
                >
                  <option value="">All Elements</option>
                  {allElements.map(el => (
                    <option key={el} value={el}>{el}</option>
                  ))}
                </select>
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-2 ring-blue-500/50 text-xs font-medium cursor-pointer"
                >
                  <option value="">All Rarities</option>
                  {allRarities.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar mt-1">
              {filteredPals.map((pal) => (
                <button
                  key={pal.name}
                  onClick={() => {
                    onChange(pal);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full p-2 flex items-center gap-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left group/item"
                >
                  {pal.image ? (
                    <img src={getImageUrl(pal.image)} referrerPolicy="no-referrer" alt={pal.name} className="w-10 h-10 object-contain drop-shadow-sm group-hover/item:scale-110 transition-transform" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{pal.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{pal.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {pal.trait && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{pal.trait}</span>}
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">PWR {pal.power}</span>
                      </span>
                    </div>
                    {pal.elements && pal.elements.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {pal.elements.map(element => (
                          <span key={element} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${ELEMENT_COLORS[element] || ELEMENT_COLORS.Neutral}`}>
                            {element}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {filteredPals.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
                  <span className="text-2xl">🔍</span>
                  <span>No Pals found</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'offspring' | 'parents' | 'path'>('offspring');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Offspring states
  const [parentA, setParentA] = useState<Pal | null>(null);
  const [parentB, setParentB] = useState<Pal | null>(null);

  // Parents states
  const [targetChild, setTargetChild] = useState<Pal | null>(null);

  // Path states
  const [pathTarget, setPathTarget] = useState<Pal | null>(null);
  const [pathStart, setPathStart] = useState<Pal | null>(null);

  const resultPal = useMemo(() => {
    if (parentA && parentB) return calculateResult(parentA, parentB);
    return null;
  }, [parentA, parentB]);

  const validCombinations = useMemo(() => {
    if (!targetChild) return [];
    
    const results: { p1: string, p2: string }[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < PALS.length; i++) {
      for (let j = i; j < PALS.length; j++) {
        const p1 = PALS[i];
        const p2 = PALS[j];
        const res = calculateResult(p1, p2);
        
        if (res && res.name === targetChild.name) {
          const key = [p1.name, p2.name].sort().join('+');
          if (!seen.has(key)) {
            results.push({ p1: p1.name, p2: p2.name });
            seen.add(key);
          }
        }
      }
    }
    return results.sort((a, b) => a.p1.localeCompare(b.p1));
  }, [targetChild]);

  const breedingPath = useMemo(() => {
    if (!pathTarget) return null;
    return findBreedingPath(pathTarget, pathStart);
  }, [pathTarget, pathStart]);

  const generateShareText = () => {
    if (activeTab === 'offspring') {
      if (parentA && parentB && resultPal) {
        return `🧬 Palworld Breeding Result:\n${parentA.name} + ${parentB.name} = ${resultPal.name}!`;
      }
      return "Check out this Palworld Breeding Calculator!";
    } else {
      if (targetChild && validCombinations.length > 0) {
        return `🔍 Want to breed ${targetChild.name}? There are ${validCombinations.length} possible combinations!`;
      }
      return "Discover how to breed any Pal in Palworld!";
    }
  };

  const handleShareAction = async (platform: string) => {
    const text = generateShareText();
    const url = window.location.href;
    const shareContent = `${text}\n\n${url}`;

    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(shareContent);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(shareContent)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
          break;
      }
      setIsShareOpen(false);
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20 max-w-4xl mx-auto font-sans">
      <header className="text-center mb-16 relative">
        <div className="absolute right-0 top-0 flex items-center justify-center">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-3 rounded-full glass hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center group"
        >
          <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-500/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-colors duration-500" />
          <div className="w-full h-full relative z-10 glass rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/10 dark:shadow-blue-900/20 rotate-3 group-hover:rotate-6 transition-transform duration-500 overflow-hidden border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20" />
            <Hexagon className="w-16 h-16 text-blue-500 dark:text-blue-400 absolute opacity-20 dark:opacity-30 stroke-[1.5] group-hover:scale-110 transition-transform duration-500" />
            <PawPrint className="w-10 h-10 text-blue-600 dark:text-blue-300 relative z-20 group-hover:rotate-12 transition-transform duration-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-sm font-medium mb-4 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>v1.0 Breeder Edition</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white"
        >
          Palworld Breeding <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Calculator</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto"
        >
          Optimize your ranch productivity with high-performance genetic mapping.
        </motion.p>
      </header>

      {/* Tabs - One UI Segmented Control Style */}
      <div className="p-1 px-1 flex bg-black/5 dark:bg-white/5 rounded-[2.5rem] mb-12 max-w-2xl mx-auto border border-black/5 dark:border-white/5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('offspring')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 rounded-[2.2rem] text-sm font-semibold transition-all duration-300 ${
            activeTab === 'offspring' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Repeat className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Find Offspring</span>
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 rounded-[2.2rem] text-sm font-semibold transition-all duration-300 ${
            activeTab === 'parents' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Find Parents</span>
        </button>
        <button
          onClick={() => setActiveTab('path')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-4 rounded-[2.2rem] text-sm font-semibold transition-all duration-300 ${
            activeTab === 'path' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Route className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Breeding Path</span>
        </button>
      </div>

      <main className="relative">
        <AnimatePresence mode="wait">
          {activeTab === 'offspring' ? (
            <motion.div
              key="offspring"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex justify-end">
                <button
                  onClick={() => { setParentA(null); setParentB(null); }}
                  className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <SearchableSelect 
                  label="Parent A" 
                  value={parentA} 
                  onChange={setParentA} 
                />
                <SearchableSelect 
                  label="Parent B" 
                  value={parentB} 
                  onChange={setParentB} 
                />
              </div>

              <div className="pt-4">
                <div className={`glass rounded-[3rem] p-6 md:p-10 transition-all relative overflow-hidden oneui-shadow ${resultPal ? 'bg-slate-900 dark:bg-slate-950 text-white border-0 shadow-2xl shadow-indigo-900/20' : ''}`}>
                  {/* Decorative background glow */}
                  <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full pointer-events-none ${resultPal ? 'bg-indigo-500/30' : 'bg-blue-500/20'}`} />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    
                    <AnimatePresence mode="wait">
                      {resultPal ? (
                        <motion.div
                          key={resultPal.name}
                          initial={{ scale: 0.9, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: -10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 24 }}
                          className="w-full max-w-2xl text-left"
                          id="introduction-panel"
                        >
                          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start p-2">
                            {/* Image Section */}
                            <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 relative rounded-[2rem] overflow-hidden glass bg-white/5 border border-white/10 p-4 shadow-xl">
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 pointer-events-none" />
                              {resultPal.image ? (
                                <img src={getImageUrl(resultPal.image).replace('100x100', '400x400')} referrerPolicy="no-referrer" className="w-full h-full object-contain drop-shadow-2xl relative z-10 hover:scale-110 transition-transform duration-500" alt={resultPal.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-[2rem] relative z-10">
                                  <span className="text-slate-400 font-medium">No Image</span>
                                </div>
                              )}
                              <div className="absolute top-3 left-3 z-20">
                                <span className="bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                                  #{resultPal.id || '???'}
                                </span>
                              </div>
                            </div>

                            {/* Details Section */}
                            <div className="flex-1 w-full space-y-5 py-2">
                              <div>
                                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-800 dark:from-indigo-200 dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent tracking-tight">{resultPal.name}</h2>
                                
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  {resultPal.trait && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-800 dark:text-teal-300 shadow-sm">
                                      {resultPal.trait}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-pink-50 dark:bg-pink-500/10 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-500/20 flex items-center gap-1 shadow-sm">
                                    <Info className="w-3 h-3" /> PWR: {resultPal.power}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-5 pt-3">
                                {resultPal.elements && resultPal.elements.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-widest block">Elements</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {resultPal.elements.map(element => (
                                        <span key={element} className={`text-xs font-bold px-3 py-1 rounded-full border bg-white/60 dark:bg-white/5 shadow-sm ${ELEMENT_COLORS[element] || ELEMENT_COLORS.Neutral}`}>
                                          {element}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {resultPal.stats && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="flex items-center gap-2 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 shadow-sm">
                                      <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-700 dark:text-red-300 font-bold block leading-none mb-1">HP</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{resultPal.stats.hp}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 shadow-sm">
                                      <Sword className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-700 dark:text-orange-300 font-bold block leading-none mb-1">Attack</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{resultPal.stats.attack.melee} / {resultPal.stats.attack.ranged}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 shadow-sm">
                                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-700 dark:text-blue-300 font-bold block leading-none mb-1">Defense</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{resultPal.stats.defense}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 shadow-sm">
                                      <Route className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-700 dark:text-green-300 font-bold block leading-none mb-1">Speed</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{resultPal.stats.speed.walk}/{resultPal.stats.speed.run}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-col md:flex-row gap-5">
                                  {resultPal.suitability && resultPal.suitability.length > 0 && (
                                    <div className="space-y-2 flex-1">
                                      <span className="text-[10px] font-bold text-[#B8860B] dark:text-[#D2691E] uppercase tracking-widest flex items-center gap-1"><Briefcase className="w-3 h-3" /> Work Suitability</span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {resultPal.suitability.map(work => (
                                          <span key={work.type} className="text-[10px] font-bold px-2 py-1 rounded-md border bg-amber-50 dark:bg-amber-900/30 flex items-center gap-1.5 border-amber-200 dark:border-amber-500/20 shadow-sm">
                                            <img src={`https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main${work.image}`} className="w-4 h-4 brightness-125 dark:brightness-100" alt={work.type} />
                                            <span className="capitalize text-amber-900 dark:text-amber-100">{work.type}</span>
                                            <span className="text-amber-100 font-bold bg-amber-700 dark:bg-amber-600 px-1.5 rounded shadow-inner">Lv {work.level}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {resultPal.drops && resultPal.drops.length > 0 && (
                                    <div className="space-y-2 flex-1">
                                      <span className="text-[10px] font-bold text-[#6A5ACD] dark:text-[#9370DB] uppercase tracking-widest flex items-center gap-1"><Package className="w-3 h-3" /> Possible Drops</span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {resultPal.drops.map(drop => (
                                          <span key={drop} className="text-[10px] font-bold px-2 py-1 rounded border bg-purple-50 dark:bg-purple-900/30 text-[#6A5ACD] dark:text-[#D8BFD8] capitalize border-purple-200 dark:border-purple-500/20 shadow-sm">
                                            {drop.replace(/_/g, ' ')}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {resultPal.aura && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-[#2F4F4F] dark:text-yellow-400 uppercase tracking-widest flex items-center gap-1"><Star className="w-3 h-3" /> Partner Skill: <span className="capitalize text-slate-800 dark:text-yellow-100">{resultPal.aura.name.replace(/_/g, ' ')}</span></span>
                                    <p className="text-xs text-[#2F4F4F] dark:text-yellow-50 bg-slate-100/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-300 dark:border-yellow-500/20 leading-relaxed italic shadow-inner font-medium">{resultPal.aura.description}</p>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-200 dark:border-white/10 mt-3">
                                <p className="text-sm md:text-base text-[#333333] dark:text-slate-200 leading-relaxed font-bold italic opacity-95">
                                  "{resultPal.paldexEntry || 'A mysterious Pal with no known records in the current Paldex database.'}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="placeholder"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4 opacity-30 text-center py-16"
                        >
                          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mx-auto">
                            Genetic Result
                          </div>
                          <h2 className="text-5xl font-bold text-slate-600">Select Parents</h2>
                          <p className="text-slate-500">Choose two Pals to see the result</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'parents' ? (
            <motion.div
              key="parents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="max-w-md mx-auto">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setTargetChild(null)}
                    className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
                <SearchableSelect 
                  label="Target Child" 
                  value={targetChild} 
                  onChange={setTargetChild} 
                  placeholder="Which Pal do you want?"
                />
              </div>

              <div className="glass rounded-[3rem] p-8 md:p-10 oneui-shadow min-h-[300px] max-h-[700px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Breed Combinations</h3>
                  {validCombinations.length > 0 && targetChild && (
                    <span className="px-4 py-1.5 glass rounded-full text-sm font-medium">
                      {validCombinations.length} matches
                    </span>
                  )}
                </div>

                {targetChild && validCombinations.length > 0 && (
                  <div className="mb-6 p-4 rounded-3xl glass bg-slate-900 dark:bg-slate-950 text-white border-0 shadow-lg relative overflow-hidden flex flex-col md:flex-row gap-6 items-center flex-shrink-0">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />
                    
                    <div className="w-24 h-24 shrink-0 relative rounded-2xl overflow-hidden glass bg-white/5 p-2 border border-white/10">
                       <img src={getImageUrl(targetChild.image)} referrerPolicy="no-referrer" className="w-full h-full object-contain drop-shadow-xl" alt={targetChild.name} />
                    </div>
                    
                    <div className="flex-1 w-full text-center md:text-left space-y-2 z-10">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
                          #{targetChild.id || '???'}
                        </span>
                        <h4 className="text-xl md:text-2xl font-bold tracking-tight">{targetChild.name}</h4>
                        {targetChild.trait && (
                           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-slate-300">
                              {targetChild.trait}
                           </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/5 flex items-center gap-1">
                           <Info className="w-3 h-3" /> PWR: {targetChild.power}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-3 mt-3 w-full max-w-2xl">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mr-1">Elements</span>
                          {targetChild.elements?.map(element => (
                            <span key={element} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border bg-white/5 shadow-sm ${ELEMENT_COLORS[element] || ELEMENT_COLORS.Neutral}`}>
                              {element}
                            </span>
                          ))}
                        </div>

                        {targetChild.stats && (
                          <div className="flex flex-wrap gap-2 text-[10px] font-medium">
                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5"><Heart className="w-3 h-3 text-red-400" /> HP {targetChild.stats.hp}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5"><Sword className="w-3 h-3 text-orange-400" /> ATK {targetChild.stats.attack.melee}/{targetChild.stats.attack.ranged}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5"><Shield className="w-3 h-3 text-blue-400" /> DEF {targetChild.stats.defense}</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5"><Route className="w-3 h-3 text-green-400" /> SPD {targetChild.stats.speed.walk}/{targetChild.stats.speed.run}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          {targetChild.suitability && targetChild.suitability.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 flex-1">
                              {targetChild.suitability.map(work => (
                                <span key={work.type} className="text-[9px] px-1.5 py-0.5 rounded border bg-white/5 flex items-center gap-1 border-white/10">
                                  <img src={`https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main${work.image}`} className="w-3 h-3" alt={work.type} />
                                  <span className="text-white font-bold bg-white/10 px-1 rounded">Lv {work.level}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {targetChild.drops && targetChild.drops.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 flex-1">
                              {targetChild.drops.map(drop => (
                                <span key={drop} className="text-[9px] px-1.5 py-0.5 rounded border bg-white/5 text-slate-300 capitalize border-white/10">
                                  {drop.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 italic opacity-90 line-clamp-2 md:line-clamp-none mt-2 pt-2 border-t border-white/10">
                         "{targetChild.paldexEntry || 'A mysterious Pal.'}"
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                  {validCombinations.length > 0 ? (
                    <div className="space-y-3">
                      {validCombinations.map((combo, idx) => {
                        const pal1 = PALS.find(p => p.name === combo.p1) || { name: combo.p1, image: '', elements: [] } as Partial<Pal>;
                        const pal2 = PALS.find(p => p.name === combo.p2) || { name: combo.p2, image: '', elements: [] } as Partial<Pal>;
                        
                        return (
                          <motion.div
                            key={`${combo.p1}-${combo.p2}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.05, 1) }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 transition-all border-dashed"
                          >
                            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3">
                               <img src={getImageUrl(pal1.image)} referrerPolicy="no-referrer" className="w-12 h-12 object-contain drop-shadow-md rounded-xl bg-white/5" alt={pal1.name} />
                               <div className="flex flex-col items-center sm:items-start gap-1">
                                 <span className="font-medium text-sm text-slate-900 dark:text-slate-100 text-center">{combo.p1}</span>
                                 {pal1.elements && (
                                   <div className="flex gap-1">
                                     {pal1.elements.slice(0, 2).map((el: string) => <span key={el} className={`w-2 h-2 rounded-full ${ELEMENT_COLORS[el] || ELEMENT_COLORS.Neutral}`} title={el} />)}
                                   </div>
                                 )}
                               </div>
                            </div>
                            <div className="text-slate-400 dark:text-slate-500 bg-black/5 dark:bg-white/5 p-2 rounded-full"><X className="w-4 h-4" /></div>
                            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3">
                               <img src={getImageUrl(pal2.image)} referrerPolicy="no-referrer" className="w-12 h-12 object-contain drop-shadow-md rounded-xl bg-white/5" alt={pal2.name} />
                               <div className="flex flex-col items-center sm:items-start gap-1">
                                 <span className="font-medium text-sm text-slate-900 dark:text-slate-100 text-center">{combo.p2}</span>
                                 {pal2.elements && (
                                   <div className="flex gap-1">
                                     {pal2.elements.slice(0, 2).map((el: string) => <span key={el} className={`w-2 h-2 rounded-full ${ELEMENT_COLORS[el] || ELEMENT_COLORS.Neutral}`} title={el} />)}
                                   </div>
                                 )}
                               </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-4 px-12">
                      <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                        <Users className="w-8 h-8 opacity-40 dark:opacity-20" />
                      </div>
                      <p>Select a target Pal to see all possible parent combinations found in the database.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="path"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-end">
                <button
                  onClick={() => { setPathTarget(null); setPathStart(null); }}
                  className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <SearchableSelect 
                  label="Target Pal (Required)" 
                  value={pathTarget} 
                  onChange={setPathTarget} 
                  placeholder="Which Pal do you want?"
                />
                <SearchableSelect 
                  label="Starting Base Pal (Optional)" 
                  value={pathStart} 
                  onChange={setPathStart} 
                  placeholder="Any Common Pal"
                />
              </div>

              <div className="glass rounded-[3rem] p-8 md:p-10 oneui-shadow min-h-[300px] overflow-hidden flex flex-col relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h3 className="text-2xl font-bold">Optimal Chain</h3>
                  {breedingPath && breedingPath.length > 0 && (
                    <span className="px-4 py-1.5 glass bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                      {breedingPath.length} step{breedingPath.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex-1 relative z-10">
                  {!pathTarget ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-4 py-12">
                      <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                        <Route className="w-8 h-8 opacity-40 dark:opacity-20" />
                      </div>
                      <p>Select a Target Pal to discover the shortest breeding path.</p>
                    </div>
                  ) : breedingPath === null ? (
                    <div className="h-full flex flex-col items-center justify-center text-rose-500 text-center space-y-4 py-12">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-2">
                        <X className="w-8 h-8 opacity-60" />
                      </div>
                      <p>No valid path found below 5 steps. Try a different starting Pal.</p>
                    </div>
                  ) : breedingPath.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-emerald-500 text-center space-y-4 py-12">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                        <Check className="w-8 h-8 opacity-60" />
                      </div>
                      <p>You already have the target Pal!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/20 before:to-pink-500/20">
                      {breedingPath.map((step, idx) => (
                        <motion.div
                          key={`step-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                        >
                          <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border-4 border-slate-50 dark:border-slate-950 bg-indigo-500 text-white shadow shadow-indigo-500/20 absolute left-1/2 -translate-x-1/2 text-xs font-bold font-mono">
                            {idx + 1}
                          </div>
                          
                          <div className="ml-12 md:ml-0 md:w-1/2 md:pr-12 md:group-odd:pr-0 md:group-odd:pl-12 w-full">
                            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur border border-white/40 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                              <div className="flex md:hidden absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-slate-50 dark:border-slate-950 bg-indigo-500 text-white shadow items-center justify-center text-xs font-bold font-mono">
                                {idx + 1}
                              </div>

                              <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center gap-2 w-full">
                                  <div className="flex-1 flex flex-col items-center bg-black/5 dark:bg-white/5 rounded-xl px-2 py-3 border border-black/5 dark:border-white/5">
                                    {step.p1.image ? (
                                      <img src={getImageUrl(step.p1.image)} referrerPolicy="no-referrer" className="w-8 h-8 object-contain mb-1 drop-shadow-sm" alt={step.p1.name} />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 mb-1">{step.p1.name.substring(0,2).toUpperCase()}</div>
                                    )}
                                    <span className="text-xs font-medium text-center text-slate-800 dark:text-slate-200">{step.p1.name}</span>
                                    {step.p1.elements && (
                                      <div className="flex gap-0.5 mt-1">
                                        {step.p1.elements.slice(0, 2).map((el: string) => <span key={el} className={`w-2 h-2 rounded-full ${ELEMENT_COLORS[el] || ELEMENT_COLORS.Neutral}`} title={el} />)}
                                      </div>
                                    )}
                                  </div>
                                  <X className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="flex-1 flex flex-col items-center bg-black/5 dark:bg-white/5 rounded-xl px-2 py-3 border border-black/5 dark:border-white/5">
                                    {step.p2.image ? (
                                      <img src={getImageUrl(step.p2.image)} referrerPolicy="no-referrer" className="w-8 h-8 object-contain mb-1 drop-shadow-sm" alt={step.p2.name} />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 mb-1">{step.p2.name.substring(0,2).toUpperCase()}</div>
                                    )}
                                    <span className="text-xs font-medium text-center text-slate-800 dark:text-slate-200">{step.p2.name}</span>
                                    {step.p2.elements && (
                                      <div className="flex gap-0.5 mt-1">
                                        {step.p2.elements.slice(0, 2).map((el: string) => <span key={el} className={`w-2 h-2 rounded-full ${ELEMENT_COLORS[el] || ELEMENT_COLORS.Neutral}`} title={el} />)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-indigo-400" />
                                <div className="w-full flex flex-col items-center bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl px-2 py-3 border border-indigo-500/20">
                                   {step.result.image ? (
                                      <img src={getImageUrl(step.result.image)} referrerPolicy="no-referrer" className="w-10 h-10 object-contain mb-1 drop-shadow-sm" alt={step.result.name} />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-900 flex items-center justify-center text-xs text-indigo-600 dark:text-indigo-300 font-bold mb-1">{step.result.name.substring(0,2).toUpperCase()}</div>
                                    )}
                                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{step.result.name}</span>
                                  {step.result.elements && (
                                    <div className="flex gap-1 mt-1">
                                      {step.result.elements.map((el: string) => <span key={el} className={`text-[10px] px-1.5 py-0 rounded-full border bg-white/50 dark:bg-black/20 ${ELEMENT_COLORS[el] || ELEMENT_COLORS.Neutral}`}>{el}</span>)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 text-center text-slate-500 dark:text-slate-600 text-sm">
        <p>© 2024 Palworld Breeding Foundation</p>
        <p className="mt-2 text-slate-400 dark:text-slate-500">Based on community-calculated breeding power stats.</p>
      </footer>

      {/* Floating Action Button for Share */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsShareOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <Share2 className="w-6 h-6" />
      </motion.button>

      {/* Share Bottom Sheet Modal */}
      <AnimatePresence>
        {isShareOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-6 rounded-t-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/40 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-bold text-center mb-8 text-slate-900 dark:text-white">Share Result</h3>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <ShareOption 
                  icon={copied ? <Check className="w-6 h-6 text-emerald-500 dark:text-emerald-400" /> : <LinkIcon className="w-6 h-6" />} 
                  label={copied ? "Copied!" : "Copy Result"} 
                  color="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" 
                  onClick={() => handleShareAction('copy')}
                />
                <ShareOption 
                  icon={<MessageCircle className="w-6 h-6" />} 
                  label="WhatsApp" 
                  color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" 
                  onClick={() => handleShareAction('whatsapp')}
                />
                <ShareOption 
                  icon={<Twitter className="w-6 h-6" />} 
                  label="Twitter" 
                  color="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400" 
                  onClick={() => handleShareAction('twitter')}
                />
                <ShareOption 
                  icon={<Facebook className="w-6 h-6" />} 
                  label="Facebook" 
                  color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" 
                  onClick={() => handleShareAction('facebook')}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
