"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { saveFavoriteMeals, subscribeToCheckedMeals, subscribeToFavorites, subscribeToMealPlanWeek } from "@/lib/firestore";
import { getTodayIndex, getWeekStartDate } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, HeartOff, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MEAL_COLORS: Record<string, string> = {
  "Early Morning": "#F59E0B",
  Breakfast: "#EF4444",
  Lunch: "#10B981",
  Snack: "#8B5CF6",
  Dinner: "#3B82F6",
};

const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
};

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const uid = user?.uid || "";

  const [favorites, setFavorites] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"diet" | "recipe">("diet");

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToFavorites(uid, (favs) => {
      setFavorites(favs);
      setLoading(false);
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = subscribeToMealPlanWeek(uid, weekStart, (data: any) => {
      if (data?.weekPlan?.days) {
        const todayIdx = getTodayIndex();
        const meals = data.weekPlan.days[todayIdx]?.meals || [];
        setTodayMeals(meals);
      } else {
        setTodayMeals([]);
      }
    });

    const unsubChecked = subscribeToCheckedMeals(uid, weekStart, (data) => {
      setCheckedMeals(data || {});
    });

    return () => {
      unsub();
      unsubMealPlan();
      unsubChecked();
    };
  }, [uid]);

  const toggleFavorite = (meal: any) => {
    if (!uid) return;
    const isFav = favorites.some((f: any) => f.name === meal.name);
    if (isFav) {
      const updated = favorites.filter((f: any) => f.name !== meal.name);
      saveFavoriteMeals(uid, updated);
    }
  };

  const dietFavs = favorites.filter((f) => f.source !== "recipe-generator");
  const recipeFavs = favorites.filter((f) => f.source === "recipe-generator");
  const currentList = activeTab === "diet" ? dietFavs : recipeFavs;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div
          className="w-12 h-12 rounded-full border-b-2 animate-spin"
          style={{ borderColor: colors.gold }}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex flex-col min-h-[100dvh] lg:min-h-screen overflow-x-hidden" style={{ backgroundColor: colors.background }}>
      {/* Header matching RN */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b flex-shrink-0" style={{ backgroundColor: colors.background, borderBottomColor: colors.divider }}>
        <button 
          onClick={() => router.back()} 
          className="w-11 h-11 rounded-full flex items-center justify-center border transition-all"
          style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent", boxShadow: `0 2px 4px ${colors.shadow}05` }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
        </button>
        <h1 className="text-lg font-black" style={{ color: colors.text }}>
          Favorite Meals
        </h1>
        <div className="w-11" /> {/* Spacer for centering */}
      </div>

      {/* Tabs matching RN (underline style) */}
      <div className="flex px-5 mb-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab("diet")}
          className="flex-1 py-3.5 flex flex-col items-center justify-center border-b-2 transition-all"
          style={{
            borderBottomColor: activeTab === "diet" ? colors.gold : "transparent",
          }}
        >
          <span className="text-sm font-bold" style={{ color: activeTab === "diet" ? colors.gold : colors.textMuted }}>
            AI Diet Plan
          </span>
        </button>
        <button
          onClick={() => setActiveTab("recipe")}
          className="flex-1 py-3.5 flex flex-col items-center justify-center border-b-2 transition-all"
          style={{
            borderBottomColor: activeTab === "recipe" ? colors.gold : "transparent",
          }}
        >
          <span className="text-sm font-bold" style={{ color: activeTab === "recipe" ? colors.gold : colors.textMuted }}>
            Recipe Generator
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6">
        <AnimatePresence mode="wait">
          {currentList.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center pt-20 px-10 text-center"
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
              >
                <HeartOff className="w-12 h-12" style={{ color: colors.gold }} />
              </div>
              <h3 className="text-xl font-black mb-3" style={{ color: colors.text }}>
                No favorites yet
              </h3>
              <p className="text-sm leading-relaxed mb-8" style={{ color: colors.textMuted }}>
                {activeTab === "diet"
                  ? "Tap the heart on any meal in your plan to save it here for quick access."
                  : "Generate and heart recipes in the AI Recipe Generator to save them here."}
              </p>
              <Link
                href={activeTab === "diet" ? "/dashboard/meal-plan" : "/dashboard/recipe-generator"}
                className="h-12 px-6 rounded-full flex items-center justify-center transition-all"
                style={{ backgroundColor: colors.primaryBtn }}
              >
                <span className="text-[15px] font-bold" style={{ color: colors.primaryBtnText }}>
                  {activeTab === "diet" ? "Go to Meal Plan" : "Go to Recipe Generator"}
                </span>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {currentList.map((item, i) => {
                if (!item || !item.name) return null;

                if (activeTab === "diet") {
                  const color = MEAL_COLORS[item.type] || colors.gold;
                  const todayIdx = getTodayIndex();
                  const isCompleted = todayMeals.some(
                    (tm, tmIdx) => tm.name === item.name && checkedMeals[`${todayIdx}-${tmIdx}`]
                  );

                  return (
                    <Link
                      key={i}
                      href={`/dashboard/meal-detail?meal=${encodeURIComponent(JSON.stringify(item))}`}
                      className="block p-[18px] rounded-[20px] border transition-all"
                      style={{ 
                        backgroundColor: colors.card, 
                        borderColor: "transparent", 
                        boxShadow: `0 4px 12px ${isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)"}` 
                      }}
                    >
                      <div className="flex items-start mb-3">
                        {/* Image */}
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 mr-3">
                          <img
                            src={getFoodImageUrl(item.imageKeyword, item.name)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute bottom-1 left-1 right-1 rounded-lg py-0.5 px-[5px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{ backgroundColor: `${color}E6` }}
                          >
                            <span className="text-white text-[8px] font-black tracking-[0.3px]">
                              {item.emoji} {item.type}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
                              ⏰ {item.time || "Flexible"}
                            </span>
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <div
                                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center border"
                                  style={{ backgroundColor: "#10B981", borderColor: "rgba(255,255,255,0.3)" }}
                                >
                                  <span className="text-white text-[10px] leading-none">✓</span>
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleFavorite(item);
                                }}
                                className="p-2 -m-2"
                              >
                                <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-base font-black mt-[3px] mb-[2px] truncate" style={{ color: colors.text }}>
                            {item.name}
                          </h3>
                          <p className="text-xs leading-[17px] line-clamp-2" style={{ color: colors.textMuted }}>
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Macros exactly like RN */}
                      <div className="flex flex-wrap gap-1.5">
                        <div className="flex items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-[10px] mr-[3px]">🔥</span>
                          <span className="text-xs font-black mr-[2px]" style={{ color: colors.text }}>{item.calories}</span>
                          <span className="text-[9px] font-semibold" style={{ color: colors.textMuted }}>kcal</span>
                        </div>
                        <div className="flex items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-[10px] mr-[3px]">💪</span>
                          <span className="text-xs font-black mr-[2px]" style={{ color: colors.text }}>{item.protein}g</span>
                          <span className="text-[9px] font-semibold" style={{ color: colors.textMuted }}>prot</span>
                        </div>
                        <div className="flex items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-[10px] mr-[3px]">🌾</span>
                          <span className="text-xs font-black mr-[2px]" style={{ color: colors.text }}>{item.carbs}g</span>
                          <span className="text-[9px] font-semibold" style={{ color: colors.textMuted }}>carb</span>
                        </div>
                        <div className="flex items-center rounded-xl px-2 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-[10px] mr-[3px]">🥑</span>
                          <span className="text-xs font-black mr-[2px]" style={{ color: colors.text }}>{item.fat}g</span>
                          <span className="text-[9px] font-semibold" style={{ color: colors.textMuted }}>fat</span>
                        </div>
                      </div>
                    </Link>
                  );
                } else {
                  // Recipe card matching RN exactly
                  return (
                    <Link
                      key={i}
                      href={`/dashboard/recipe-detail?recipe=${encodeURIComponent(JSON.stringify(item))}`}
                      className="block p-5 rounded-[22px] border transition-all"
                      style={{ 
                        backgroundColor: colors.card, 
                        borderColor: "transparent",
                        boxShadow: `0 3px 12px ${isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.06)"}` 
                      }}
                    >
                      <div className="flex items-start mb-3.5">
                        {/* Image */}
                        <div className="relative w-16 h-16 rounded-[14px] overflow-hidden flex-shrink-0 mr-3.5">
                          <img
                            src={getFoodImageUrl(item.name)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 rounded-lg py-0.5 px-1 bg-black/60">
                            <span className="text-white text-[10px] font-black">{item.emoji}</span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[17px] font-black mb-1 truncate" style={{ color: colors.text }}>
                            {item.name}
                          </h3>
                          <p className="text-[13px] leading-[19px] line-clamp-2" style={{ color: colors.textSecondary }}>
                            {item.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(item);
                            }}
                            className="p-2 -m-2"
                          >
                            <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                          </button>
                          <div 
                            className="w-[30px] h-[30px] rounded-full flex items-center justify-center ml-2"
                            style={{ backgroundColor: colors.surface }}
                          >
                            <span className="text-base font-black leading-none" style={{ color: colors.text }}>›</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex flex-row items-center gap-2 mb-3">
                        <div className="flex flex-row items-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-xs mr-1">🔥</span>
                          <span className="text-sm font-black mr-0.5" style={{ color: colors.text }}>{item.calories}</span>
                          <span className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>kcal</span>
                        </div>
                        <div className="flex flex-row items-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-xs mr-1">⏱️</span>
                          <span className="text-sm font-black mr-0.5" style={{ color: colors.text }}>{item.timeMinutes}</span>
                          <span className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>min</span>
                        </div>
                        <div className="flex flex-row items-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors.surface }}>
                          <span className="text-xs mr-1">🍽️</span>
                          <span className="text-sm font-black mr-0.5" style={{ color: colors.text }}>{item.servings}</span>
                          <span className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>serve</span>
                        </div>
                        <div 
                          className="rounded-[10px] px-2.5 py-[5px] ml-auto"
                          style={{ backgroundColor: isDark ? "rgba(212,162,78,0.15)" : "rgba(212,162,78,0.12)" }}
                        >
                          <span className="text-[11px] font-bold" style={{ color: colors.gold }}>
                            {item.mealType}
                          </span>
                        </div>
                      </div>

                      {/* Dosha Note */}
                      <div
                        className="flex flex-row items-start rounded-xl p-3"
                        style={{ backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)" }}
                      >
                        <span className="text-sm mr-2 mt-[1px]">🌿</span>
                        <span className="flex-1 text-xs leading-[18px] font-medium" style={{ color: isDark ? "#6EE7B7" : "#065F46" }}>
                          {item.doshaBalance}
                        </span>
                      </div>
                    </Link>
                  );
                }
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
