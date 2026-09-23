"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { getGreeting, getInitials } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    Check,
    ChefHat,
    ChevronRight,
    Flame,
    Heart,
    Leaf,
    Lock,
    MessageCircle,
    Scan,
    Utensils
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Meal {
  name: string;
  type: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageKeyword?: string;
}

interface Stats {
  dosha: string;
  plans: string;
  streak: string;
}

const quickActions = [
  { icon: Leaf, label: "Dosha Assessment", desc: "Discover your constitution", href: "/dashboard/dosha", color: "#10B981" },
  { icon: Utensils, label: "AI Diet Plan", desc: "Personalized meal plans", href: "/dashboard/meal-plan", color: "#F59E0B" },
  { icon: ChefHat, label: "Recipe Generator", desc: "Create custom recipes", href: "/dashboard/recipes", color: "#EF4444" },
  { icon: Scan, label: "Food Scanner", desc: "Analyze any food", href: "/dashboard/scanner", color: "#3B82F6" },
  { icon: MessageCircle, label: "Ask Vaidya AI", desc: "Your Ayurvedic guide", href: "/dashboard/chat", color: "#8B5CF6" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<Stats>({ dosha: "Discover", plans: "0 Active", streak: "0 Days" });
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const displayName = user?.displayName || "Guest";
  const firstName = displayName.split(" ")[0];
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!user?.uid) {
      console.log("[Dashboard] No user UID available");
      return;
    }

    console.log("[Dashboard] Fetching data for user:", user.uid);

    const unsubProfile = firestore.subscribeToProfile(user.uid, (data) => {
      if (data?.photoURL) setProfilePhoto(data.photoURL);
    });

    const unsubDosha = firestore.subscribeToDoshaResult(user.uid, (data) => {
      console.log("[Dashboard] Dosha data received:", data);
      setStats((prev) => ({ ...prev, dosha: data?.doshaType || "Discover" }));
    });

    const unsubOnboarding = firestore.subscribeToOnboarding(user.uid, (data) => {
      console.log("[Dashboard] Onboarding data received:", data);
      if (data?.completed) {
        setStats((prev) => ({ ...prev, plans: "1 Active", streak: "1 Day" }));
      }
    });

    const weekStart = getWeekStartDate();
    console.log("[Dashboard] Fetching meal plan for week:", weekStart);
    const unsubMealPlan = firestore.subscribeToMealPlanWeek(user.uid, weekStart, (data) => {
      console.log("[Dashboard] Meal plan data received:", data);
      if (data?.weekPlan?.days) {
        const todayIdx = getTodayIndex();
        const meals = data.weekPlan.days[todayIdx]?.meals || [];
        setTodayMeals(meals);
      }
      setLoading(false);
    });

    const unsubChecked = firestore.subscribeToCheckedMeals(user.uid, weekStart, (data) => {
      setCheckedMeals(data || {});
    });

    const unsubFavorites = firestore.subscribeToFavorites(user.uid, (favs) => {
      setFavorites(favs || []);
    });

    return () => {
      unsubProfile();
      unsubDosha();
      unsubOnboarding();
      unsubMealPlan();
      unsubChecked();
      unsubFavorites();
    };
  }, [user?.uid]);

  const toggleMealCheck = (mealIdx: number) => {
    if (!user?.uid) return;
    const todayIdx = getTodayIndex();
    const key = `${todayIdx}-${mealIdx}`;
    const updated = { ...checkedMeals, [key]: !checkedMeals[key] };
    setCheckedMeals(updated);
    const weekStart = getWeekStartDate();
    firestore.saveCheckedMeals(user.uid, updated, weekStart);
  };

  const toggleFavorite = (meal: Meal) => {
    if (!user?.uid) return;
    const isFav = favorites.some((f) => f.name === meal.name);
    const updated = isFav ? favorites.filter((f) => f.name !== meal.name) : [...favorites, meal];
    setFavorites(updated);
    firestore.saveFavoriteMeals(user.uid, updated);
  };

  const todayIdx = getTodayIndex();
  const consumedCals = todayMeals.reduce((sum, meal, idx) => {
    return checkedMeals[`${todayIdx}-${idx}`] ? sum + (meal.calories || 0) : sum;
  }, 0);
  const totalCals = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 1860;
  const progressPercent = totalCals > 0 ? (consumedCals / totalCals) : 0;

  const consumedMacros = todayMeals.reduce(
    (acc, meal, idx) => {
      if (checkedMeals[`${todayIdx}-${idx}`]) {
        acc.p += meal.protein || 0;
        acc.c += meal.carbs || 0;
        acc.f += meal.fat || 0;
      }
      return acc;
    },
    { p: 0, c: 0, f: 0 }
  );

  const targetMacros = todayMeals.reduce(
    (acc, meal) => {
      acc.p += meal.protein || 0;
      acc.c += meal.carbs || 0;
      acc.f += meal.fat || 0;
      return acc;
    },
    { p: 0, c: 0, f: 0 }
  );

  const isDoshaCompleted = stats.dosha !== "Discover";

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-4 lg:space-y-6 pb-6 overflow-x-hidden lg:overflow-visible">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] lg:rounded-3xl p-4 lg:p-8"
        style={{ backgroundColor: isDark ? colors.card : colors.headerBg }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: isDark ? colors.textSecondary : colors.textOnHeaderSub }}>
              {getGreeting()}
            </p>
            <h1 className="text-3xl lg:text-4xl font-black" style={{ color: colors.textOnHeader }}>
              {firstName} 🙏
            </h1>
          </div>
          <Link href="/dashboard/profile">
            {profilePhoto || user?.photoURL ? (
              <img 
                src={profilePhoto || user?.photoURL || ""} 
                alt="Profile" 
                className="w-12 h-12 rounded-full object-cover transition-opacity hover:opacity-80"
                style={{ border: `2px solid ${colors.gold}50` }}
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-opacity hover:opacity-80"
                style={{ 
                  backgroundColor: `${colors.gold}20`,
                  color: colors.gold,
                  border: `2px solid ${colors.gold}50`,
                }}
              >
                {initials}
              </div>
            )}
          </Link>
        </div>

        {/* Gold Line */}
        <div className="h-1 rounded-full mt-6 mb-6 opacity-30" style={{ backgroundColor: colors.gold }} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Leaf, label: "Dosha", value: stats.dosha, color: "#10B981" },
            { icon: Utensils, label: "Plans", value: stats.plans, color: "#F59E0B" },
            { icon: Flame, label: "Streak", value: stats.streak, color: "#EF4444" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-[20px] lg:rounded-2xl p-3 lg:p-4 text-center border"
              style={{ 
                backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.10)",
                borderColor: isDark ? colors.cardBorder : "rgba(255,255,255,0.15)",
              }}
            >
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: colors.gold }} />
              </div>
              <p className="font-bold text-lg" style={{ color: colors.textOnHeader }}>{stat.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: isDark ? colors.textSecondary : "rgba(255,255,255,0.5)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Today's Journey */}
      {todayMeals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
          style={{ backgroundColor: colors.card, borderColor: "transparent", boxShadow: `0 4px 20px ${colors.shadow}` }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[22px] font-black tracking-tight" style={{ color: colors.text }}>Today's Journey</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-xl leading-none" style={{ color: colors.gold }}>{consumedCals}</span>
                  <span className="text-[13px] font-bold" style={{ color: colors.textMuted }}>/ {totalCals} kcal</span>
                </div>
                <div 
                  className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center relative"
                  style={{ 
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)"
                  }}
                >
                  {/* Fake progress ring arc (CSS trick for circular progress) */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="17"
                      cy="17"
                      r="16"
                      fill="none"
                      stroke={colors.gold}
                      strokeWidth="3"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (progressPercent * 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="text-[11px] font-black z-10" style={{ color: colors.gold }}>{Math.round(progressPercent * 100)}%</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/meal-plan"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: isDark ? "rgba(253,224,71,0.08)" : "rgba(245,158,11,0.06)",
                borderColor: isDark ? "rgba(253,224,71,0.20)" : "rgba(245,158,11,0.15)",
                color: colors.gold,
              }}
            >
              View Week
              <ChevronRight className="w-4 h-4 -mr-1" />
            </Link>
          </div>

          {/* Macro Pills Row */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { icon: "💪", label: "Protein", consumed: consumedMacros.p, target: targetMacros.p || 66, color: "#EF4444" },
              { icon: "🌾", label: "Carbs", consumed: consumedMacros.c, target: targetMacros.c || 207, color: "#10B981" },
              { icon: "🥑", label: "Fat", consumed: consumedMacros.f, target: targetMacros.f || 52, color: "#3B82F6" },
            ].map((macro, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border"
                style={{ 
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }}
              >
                <span className="text-[13px]">{macro.icon}</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-[13px]" style={{ color: colors.text }}>{macro.consumed}</span>
                  <span className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>/ {macro.target}g</span>
                </div>
              </div>
            ))}
          </div>

          {/* Horizontal Scrolling Meal Cards */}
          <div className="-mx-2 px-2">
            <div 
              className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {todayMeals.map((meal, i) => {
                const isChecked = checkedMeals[`${todayIdx}-${i}`];
                const isFav = favorites.some((f) => f.name === meal.name);
                return (
                  <div
                    key={i}
                    onClick={() => window.location.href = `/dashboard/meal-detail?meal=${encodeURIComponent(JSON.stringify(meal))}`}
                    className="flex-shrink-0 w-[280px] rounded-2xl overflow-hidden border snap-start cursor-pointer group"
                    style={{ backgroundColor: colors.surface, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
                  >
                    {/* Meal Badge Row */}
                    <div className="flex items-center justify-between p-3" style={{ backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }}>
                      <div 
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                        style={{ 
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                        }}
                      >
                        <span className="text-[13px]">{meal.emoji}</span>
                        <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: colors.gold }}>{meal.type}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(meal); }}
                          className="w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                        >
                          <Heart 
                            className="w-4 h-4" 
                            fill={isFav ? "#EF4444" : "none"}
                            color={isFav ? "#EF4444" : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                            strokeWidth={isFav ? 0 : 2.5}
                          />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMealCheck(i); }}
                          className="w-[28px] h-[28px] rounded-full flex items-center justify-center border transition-all"
                          style={{ 
                            backgroundColor: isChecked ? colors.text : "transparent",
                            borderColor: isChecked ? colors.text : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                          }}
                        >
                          <Check className="w-4 h-4" strokeWidth={3} color={isChecked ? (isDark ? "#000" : "#FFF") : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)")} />
                        </button>
                      </div>
                    </div>

                    {/* Food Image with Gradient */}
                    <div className="h-[160px] relative overflow-hidden">
                      <img
                        src={getFoodImageUrl(meal.imageKeyword, meal.name, meal.type)}
                        alt={meal.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getDefaultMealImage(meal.type);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                      
                      {/* Meal Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col justify-end h-full pointer-events-none">
                        <h3 className="font-black text-white text-[17px] leading-tight mb-2.5 line-clamp-2 drop-shadow-md">{meal.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10">
                            <span className="text-[10px]">🔥</span>
                            <span className="text-[11px] font-black text-white tracking-wide">{meal.calories}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10">
                            <span className="text-[10px]">💪</span>
                            <span className="text-[11px] font-black text-white tracking-wide">{meal.protein}g</span>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10">
                            <span className="text-[10px]">🌾</span>
                            <span className="text-[11px] font-black text-white tracking-wide">{meal.carbs}g</span>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10">
                            <span className="text-[10px]">🥑</span>
                            <span className="text-[11px] font-black text-white tracking-wide">{meal.fat}g</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Dots */}
          {todayMeals.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {todayMeals.map((_, dotIdx) => (
                <div
                  key={dotIdx}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ 
                    backgroundColor: dotIdx === 0 ? colors.gold : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                    width: dotIdx === 0 ? "16px" : "6px"
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((action, i) => {
            const disabled = action.href === "/dashboard/meal-plan" && !isDoshaCompleted;
            return (
              <Link
                key={i}
                href={disabled ? "#" : action.href}
                onClick={(e) => disabled && e.preventDefault()}
                className={`rounded-2xl p-4 border transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                style={{ 
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="w-6 h-6" style={{ color: disabled ? colors.textMuted : action.color }} />
                  </div>
                  {!disabled && (
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                    </div>
                  )}
                  {disabled && (
                    <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-sm mb-1" style={{ color: disabled ? colors.textMuted : colors.text }}>
                  {action.label}
                </h3>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  {disabled ? "Complete Dosha assessment first" : action.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Ayurvedic Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-5 border"
        style={{ backgroundColor: colors.tipBg, borderColor: colors.tipBorder }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: isDark ? `${colors.gold}08` : `${colors.gold}06` }}
          >
            <span className="text-lg">💡</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.tipText }}>
            Ayurvedic Tip
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: colors.tipText }}>
          Start your day with warm water and lemon to balance your digestive fire (Agni) and boost metabolism naturally.
        </p>
      </motion.div>
    </div>
  );
}

// Helper functions
const MEAL_DEFAULT_IMAGES: Record<string, string> = {
  "Early Morning": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80",
  "Breakfast": "https://images.unsplash.com/photo-1645177628172-a94c1f96debb?w=800&q=80",
  "Lunch": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  "Snack": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80",
  "Dinner": "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
};

function getDefaultMealImage(mealType?: string): string {
  return MEAL_DEFAULT_IMAGES[mealType || "Lunch"] || MEAL_DEFAULT_IMAGES["Lunch"];
}

function getFoodImageUrl(keyword?: string, fallbackName?: string, mealType?: string): string {
  const term = keyword || fallbackName;
  if (term) {
    return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=800&h=400&c=7&rs=1&p=0`;
  }
  return getDefaultMealImage(mealType);
}

function getWeekStartDate(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}
