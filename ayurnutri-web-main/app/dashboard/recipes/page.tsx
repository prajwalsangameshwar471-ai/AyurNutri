"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { callLLM } from "@/lib/llm";
import { buildRecipePrompt } from "@/lib/prompts";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Recipe = {
  name: string;
  emoji: string;
  description: string;
  calories: number;
  timeMinutes: number;
  servings: number;
  ingredients: { name: string; amount: string; emoji: string }[];
  instructions: string[];
  doshaBalance: string;
  mealType: string;
};

const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
};

const QUICK_PROMPTS = [
  { label: "🌅 Breakfast ideas", value: "Suggest healthy Ayurvedic breakfast options" },
  { label: "🥗 Light lunch", value: "Light and easy Ayurvedic lunch recipes" },
  { label: "🌙 Dinner", value: "Warm and comforting Ayurvedic dinner recipes" },
  { label: "🍵 Detox drinks", value: "Ayurvedic detox drink and smoothie recipes" },
  { label: "🌿 Immunity boosters", value: "Immunity boosting Ayurvedic recipes with turmeric and herbs" },
  { label: "⚡ High protein", value: "High protein vegetarian Ayurvedic meals" },
];

function extractAndParseJSON<T>(text: string): T {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("JSON parse error:", e);
    throw e;
  }
}

// In-memory caching logic
let pendingRecipeGeneration: { promise: Promise<Recipe[]>; inputKey: string } | null = null;
let lastRecipeState: { input: string; recipes: Recipe[] } | null = null;

export default function RecipesPage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  
  const uid = user?.uid || "";

  const [doshaType, setDoshaType] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [maxTime, setMaxTime] = useState<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubDosha = firestore.subscribeToDoshaResult(uid, (d) => {
      setDoshaType(d?.doshaType || null);
    });
    const unsubFavs = firestore.subscribeToFavorites(uid, (favs) => {
      setFavorites(favs || []);
    });
    return () => {
      unsubDosha();
      unsubFavs();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (lastRecipeState && lastRecipeState.recipes.length > 0 && !pendingRecipeGeneration) {
      setInput(lastRecipeState.input);
      setRecipes(lastRecipeState.recipes);
      return;
    }

    async function loadRecent() {
      const recent = await firestore.getRecentRecipeCache(uid);
      if (recent && recent.recipes && recent.recipes.length > 0) {
        setInput(recent.input);
        setRecipes(recent.recipes);
        lastRecipeState = { input: recent.input, recipes: recent.recipes };
      }
    }
    loadRecent();
  }, [uid]);

  useEffect(() => {
    if (pendingRecipeGeneration) {
      setLoading(true);
      if (pendingRecipeGeneration.inputKey) {
        setInput(pendingRecipeGeneration.inputKey);
      }
      pendingRecipeGeneration.promise
        .then((parsed) => {
          if (parsed && parsed.length > 0) {
            setRecipes(parsed);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const toggleFavorite = (recipe: Recipe) => {
    if (!uid) return;
    const isFav = favorites.some((f: any) => f.name === recipe.name && f.source === "recipe-generator");
    let updated;
    if (isFav) {
      updated = favorites.filter((f: any) => !(f.name === recipe.name && f.source === "recipe-generator"));
    } else {
      updated = [...favorites, { ...recipe, source: "recipe-generator" }];
    }
    firestore.saveFavoriteMeals(uid, updated);
  };

  const handleGenerate = async (customInput?: string, forceRegenerate = false) => {
    const text = customInput || input;
    if (!text.trim()) return;

    if (pendingRecipeGeneration && !forceRegenerate) return;

    if (forceRegenerate) {
      pendingRecipeGeneration = null;
    }

    setLoading(true);
    setError("");
    setRecipes([]);

    const generationPromise = (async (): Promise<Recipe[]> => {
      try {
        if (!forceRegenerate) {
          const cached = await firestore.getRecipeCache(text.trim(), doshaType || undefined);
          if (cached && cached.length > 0) {
            lastRecipeState = { input: text, recipes: cached };
            return cached;
          }
        }

        const prompt = buildRecipePrompt(text.trim(), doshaType || undefined);
        const result = await callLLM(prompt, 8000);
        const parsed = extractAndParseJSON<Recipe[]>(result);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Parsed data is not a valid recipe array.");
        }

        if (uid) {
          await firestore.saveRecipeCache(uid, text.trim(), doshaType || undefined, parsed);
        }

        lastRecipeState = { input: text, recipes: parsed };
        return parsed;
      } catch (e: any) {
        throw e;
      } finally {
        pendingRecipeGeneration = null;
      }
    })();

    pendingRecipeGeneration = { promise: generationPromise, inputKey: text };

    try {
      const parsed = await generationPromise;
      setRecipes(parsed);
    } catch (e: any) {
      if (e instanceof SyntaxError && e.message.includes("Unterminated string")) {
        setError("The recipe was too long and got cut off by the AI. Please try asking for fewer recipes.");
      } else {
        setError("Failed to parse recipe data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTime = maxTime ? recipe.timeMinutes <= maxTime : true;
    return matchesSearch && matchesTime;
  });

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto space-y-4 lg:space-y-6 pb-6 overflow-x-hidden lg:overflow-visible">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6"
        style={{ backgroundColor: colors.headerBg }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black mb-1" style={{ color: colors.textOnHeader }}>
              AI Recipe Generator
            </h1>
            <p className="text-sm font-medium" style={{ color: colors.textOnHeaderSub }}>
              Generate personalized Ayurvedic recipes
            </p>
          </div>
          {doshaType && (
            <div 
              className="px-3 py-1.5 rounded-full font-black text-xs uppercase tracking-wider"
              style={{ backgroundColor: `${colors.gold}33`, color: colors.gold }}
            >
              {doshaType}
            </div>
          )}
        </div>
      </motion.div>

      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
        style={{ backgroundColor: colors.card, borderColor: "transparent", boxShadow: `0 4px 20px ${colors.shadow}` }}
      >
        <h2 className="text-[11px] font-black uppercase tracking-[1.5px] mb-3 opacity-60" style={{ color: colors.text }}>
          WHAT DO YOU WANT TO COOK?
        </h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Something light with lentils and spices..."
          className="w-full h-[88px] lg:h-24 rounded-[16px] lg:rounded-2xl p-3 lg:p-4 text-[14px] lg:text-[15px] font-medium resize-none outline-none mb-4 lg:mb-6 border"
          style={{ 
            backgroundColor: colors.inputBg, 
            color: colors.text,
            borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent"
          }}
        />

        <h2 className="text-[11px] font-black uppercase tracking-[1.5px] mb-3 opacity-60" style={{ color: colors.text }}>
          QUICK IDEAS
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(p.value);
                handleGenerate(p.value);
              }}
              className="flex-shrink-0 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl lg:rounded-[14px] text-[12px] lg:text-[13px] font-bold border transition-all hover:scale-105"
              style={{ 
                backgroundColor: colors.card, 
                color: colors.text,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                boxShadow: `0 2px 8px ${colors.shadow}`
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleGenerate()}
          disabled={!input.trim() || loading}
          className="w-full mt-2 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: colors.primaryBtn, color: colors.primaryBtnText }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2" style={{ borderColor: `${colors.gold} transparent transparent transparent` }} />
              <span style={{ color: colors.primaryBtnText }}>AI is cooking...</span>
            </div>
          ) : (
            <>
              Generate Recipes <Sparkles className="w-5 h-5 ml-1" />
            </>
          )}
        </button>
      </motion.div>

      {error && (
        <div 
          className="p-4 rounded-2xl border font-semibold text-sm"
          style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBorder, color: colors.errorText }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {recipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2 pt-4">
              <h2 className="text-xl font-black" style={{ color: colors.text }}>
                🌿 Suggestions
              </h2>
              <button
                onClick={() => handleGenerate(undefined, true)}
                disabled={loading}
                className="px-4 py-1.5 rounded-full text-[13px] font-bold border transition-colors hover:opacity-80"
                style={{ backgroundColor: colors.surface, borderColor: "transparent", color: colors.gold }}
              >
                Regenerate 🔄
              </button>
            </div>

            {/* Filtering Controls */}
            <div 
              className="rounded-[20px] lg:rounded-3xl p-3 lg:p-4 border flex flex-col gap-2 lg:gap-3"
              style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
            >
              <input
                type="text"
                placeholder="Search recipes (e.g., Mung Dal)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl p-3 text-sm font-semibold outline-none border"
                style={{ backgroundColor: colors.inputBg, color: colors.text, borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent" }}
              />
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                {[null, 15, 30, 45].map((timeOption) => {
                  const isSelected = maxTime === timeOption;
                  return (
                    <button
                      key={timeOption || 'any'}
                      onClick={() => setMaxTime(timeOption)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                      style={{ 
                        backgroundColor: isSelected ? colors.gold : colors.surface,
                        borderColor: isSelected ? colors.gold : "transparent",
                        color: isSelected ? "#FFF" : colors.textSecondary 
                      }}
                    >
                      {timeOption ? `Under ${timeOption}m` : "Any Time"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipe List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              {filteredRecipes.map((recipe, i) => {
                const isFav = favorites.some((f: any) => f.name === recipe.name && f.source === "recipe-generator");

                return (
                  <Link
                    key={i}
                    href={`/dashboard/recipe-detail?recipe=${encodeURIComponent(JSON.stringify(recipe))}`}
                    className="block p-3 lg:p-4 rounded-[20px] lg:rounded-[24px] transition-all hover:scale-[1.01] border"
                    style={{ 
                      backgroundColor: isDark ? "#1C281E" : colors.card,
                      borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent",
                      boxShadow: `0 4px 20px ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)"}` 
                    }}
                  >
                    <div className="flex items-start mb-4">
                      {/* Image */}
                      <div className="relative w-[72px] h-[72px] md:w-[84px] md:h-[84px] rounded-[18px] overflow-hidden flex-shrink-0 mr-4 shadow-sm border border-black/5">
                        <img
                          src={getFoodImageUrl(recipe.name)}
                          alt={recipe.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 rounded-lg py-0.5 px-1 bg-black/60 backdrop-blur-md">
                          <span className="text-white text-[10px] font-black">{recipe.emoji}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-start justify-between">
                          <h3 className="text-[17px] md:text-[19px] font-black mb-1 truncate pr-2" style={{ color: colors.text }}>
                            {recipe.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(recipe);
                              }}
                              className="p-1 -m-1"
                            >
                              <Heart 
                                className="w-[22px] h-[22px] transition-colors" 
                                fill={isFav ? "#EF4444" : "none"} 
                                color={isFav ? "#EF4444" : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"} 
                                strokeWidth={2.5}
                              />
                            </button>
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-black/20"
                              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                            >
                              <span className="text-sm font-black leading-none mt-[-1px]" style={{ color: isDark ? "#FFF" : "#000" }}>›</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[13px] md:text-[14px] leading-[20px] line-clamp-2 mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="flex flex-row items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.04)" }}>
                        <span className="text-[13px] mr-1.5">🔥</span>
                        <span className="text-[13px] md:text-sm font-black mr-1" style={{ color: colors.text }}>{recipe.calories}</span>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>kcal</span>
                      </div>
                      <div className="flex flex-row items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.04)" }}>
                        <span className="text-[13px] mr-1.5">⏱️</span>
                        <span className="text-[13px] md:text-sm font-black mr-1" style={{ color: colors.text }}>{recipe.timeMinutes}</span>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>min</span>
                      </div>
                      <div className="flex flex-row items-center rounded-xl px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.04)" }}>
                        <span className="text-[13px] mr-1.5">🍽️</span>
                        <span className="text-[13px] md:text-sm font-black mr-1" style={{ color: colors.text }}>{recipe.servings}</span>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>serve</span>
                      </div>
                      <div 
                        className="rounded-xl px-3 py-1.5 ml-auto"
                        style={{ backgroundColor: isDark ? "rgba(212,162,78,0.15)" : "rgba(212,162,78,0.12)" }}
                      >
                        <span className="text-[12px] font-black" style={{ color: colors.gold }}>
                          {recipe.mealType}
                        </span>
                      </div>
                    </div>

                    {/* Dosha Note */}
                    <div
                      className="flex flex-row items-start rounded-[16px] p-3.5"
                      style={{ backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)" }}
                    >
                      <span className="text-base mr-2.5 mt-[1px]">🌿</span>
                      <span className="flex-1 text-[13px] md:text-[14px] leading-[20px] font-medium" style={{ color: isDark ? "#6EE7B7" : "#065F46" }}>
                        {recipe.doshaBalance}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {filteredRecipes.length === 0 && (
              <div className="text-center py-10 opacity-60 font-semibold" style={{ color: colors.textMuted }}>
                No recipes matched your filters.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
