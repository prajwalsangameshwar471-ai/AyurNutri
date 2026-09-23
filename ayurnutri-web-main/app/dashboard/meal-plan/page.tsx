"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { callLLM, extractAndParseJSON } from "@/lib/llm";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Leaf,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─── Types ─── */
interface Meal {
  type: string;
  time: string;
  emoji: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageKeyword?: string;
}

interface DayPlan {
  day: string;
  totalCalories: number;
  meals: Meal[];
}

interface WeekPlan {
  weeklyCalories: number;
  doshaNote?: string;
  days: DayPlan[];
}

/* ─── Constants ─── */
const MEAL_COLORS: Record<string, string> = {
  "Early Morning": "#F59E0B",
  Breakfast: "#EF4444",
  Lunch: "#10B981",
  Snack: "#8B5CF6",
  Dinner: "#3B82F6",
};

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ─── Prompt Builder (mirrors RN prompts.ts) ─── */
function buildMealPlanPrompt(
  doshaType?: string,
  doshaAnalysis?: string,
  goal?: string,
  weight?: number,
  height?: number,
  age?: number,
  diet?: string,
  region?: string,
  season?: { name: string; ayurvedic: string; dominantDosha: string; advice: string },
  favoriteMeals?: string[],
  dislikedMeals?: string[],
  weekLabel?: string
): string {
  let doshaContext = "";
  if (doshaType && doshaAnalysis) {
    try {
      const analysis = JSON.parse(doshaAnalysis);
      doshaContext = `PATIENT DOSHA PROFILE:\n• Prakriti: ${doshaType}\n• Recommended Diet: ${(analysis.dietTips || []).join(" | ")}\n• Beneficial Herbs/Spices: ${(analysis.herbs || []).join(", ")}\n• Health Challenges: ${(analysis.challenges || []).join(" | ")}\n• Seasonal Consideration: ${analysis.seasonalAdvice || "Follow general Ritucharya"}`;
    } catch {
      doshaContext = `Patient's Prakriti: ${doshaType}. Tailor meals to balance ${doshaType} dosha.`;
    }
  } else if (doshaType) {
    doshaContext = `Patient's Prakriti: ${doshaType}. Tailor meals to balance ${doshaType} dosha.`;
  } else {
    doshaContext = "No dosha assessment done. Provide tridoshic (universally balanced) meals.";
  }

  const goalTargets: Record<string, string> = {
    lose: "WEIGHT LOSS: 1400-1600 kcal/day, high fiber, low oil, emphasize light (Laghu) foods.",
    gain: "HEALTHY WEIGHT GAIN: 2200-2500 kcal/day, emphasize nourishing (Brimhana) foods.",
    muscle: "MUSCLE BUILDING: 2000-2300 kcal/day, high protein (80-100g/day).",
    balance: "DOSHA BALANCE: 1700-1900 kcal/day, strictly follow dosha-specific diet.",
    energy: "ENERGY BOOST: 1800-2000 kcal/day, iron-rich foods, sustained energy.",
  };
  const goalContext = goal ? goalTargets[goal] || "GENERAL WELLNESS: 1700-1900 kcal/day." : "GENERAL WELLNESS: 1700-1900 kcal/day.";
  const bodyContext = weight && height && age ? `Patient: ${age} years old, ${weight}kg, ${height}cm (BMI: ${(weight / ((height / 100) ** 2)).toFixed(1)})` : "";
  const isSpecificState = region && region !== "India" && !region.includes("All India") && !region.includes("General");
  const regionName = isSpecificState ? region : "India";
  const preferenceContext = `DIETARY PREFERENCES:\n• Diet Type: ${diet ? diet.toUpperCase() : "Any"}\n• Region: ${isSpecificState ? `${regionName}, India — include authentic ${regionName} foods` : "Pan-India"}`;
  const seasonContext = season ? `SEASONAL CONTEXT (Ritucharya):\n• Season: ${season.name} (${season.ayurvedic})\n• Dominant Dosha: ${season.dominantDosha}\n• Seasonal Guideline: ${season.advice}` : "";
  let preferenceLearn = "";
  if (favoriteMeals && favoriteMeals.length > 0) preferenceLearn += `USER'S FAVORITE MEALS (include 2-3 of these):\n${favoriteMeals.map((m) => `• ${m}`).join("\n")}`;
  if (dislikedMeals && dislikedMeals.length > 0) preferenceLearn += `\nMEALS TO AVOID:\n${dislikedMeals.map((m) => `• ${m}`).join("\n")}`;
  const weekContext = weekLabel ? `\nThis plan is for the week of ${weekLabel}.\n` : "";

  return `You are a senior Ayurvedic nutritionist creating a clinical-grade personalized 7-day meal plan.

${doshaContext}
${preferenceContext}
GOAL: ${goalContext}
${bodyContext}
${seasonContext}
${preferenceLearn}
${weekContext}
RESPOND WITH ONLY VALID JSON — no markdown, no backticks:
{
  "weeklyCalories": <total weekly calories as integer>,
  "doshaNote": "2 sentences about how this plan helps ${doshaType || "overall"} constitution.",
  "days": [
    {
      "day": "Monday",
      "totalCalories": <sum of all meals>,
      "meals": [
        { "type": "Early Morning", "time": "6:30 AM", "emoji": "🌅", "name": "Warm Turmeric Lemon Water", "description": "Kindles Agni and flushes Ama", "calories": 30, "protein": 0, "carbs": 8, "fat": 0, "imageKeyword": "turmeric lemon water" },
        { "type": "Breakfast", "time": "8:00 AM", "emoji": "☀️", "name": "Specific dish", "description": "Ayurvedic benefit", "calories": 380, "protein": 12, "carbs": 52, "fat": 10, "imageKeyword": "poha breakfast" },
        { "type": "Lunch", "time": "12:30 PM", "emoji": "🍛", "name": "Specific dish — LARGEST meal", "description": "Peak Pitta time benefit", "calories": 550, "protein": 22, "carbs": 72, "fat": 14, "imageKeyword": "dal rice thali" },
        { "type": "Snack", "time": "4:00 PM", "emoji": "🍵", "name": "Light snack", "description": "Ayurvedic benefit", "calories": 150, "protein": 4, "carbs": 18, "fat": 6, "imageKeyword": "masala chai snack" },
        { "type": "Dinner", "time": "7:00 PM", "emoji": "🌙", "name": "Light dinner", "description": "Evening Kapha time benefit", "calories": 380, "protein": 14, "carbs": 48, "fat": 12, "imageKeyword": "khichdi dinner" }
      ]
    }
  ]
}

STRICT RULES:
1. Include ALL 7 days (Monday through Sunday) with EXACTLY 5 meals each = 35 total meals
2. ZERO repeated dishes across the entire week
3. ALL food must be authentic Indian/Ayurvedic cuisine — NO Western food
4. Lunch is ALWAYS the heaviest meal
5. Dinner is ALWAYS lighter than lunch
6. imageKeyword must be 2-4 words for image search`;
}

/* ─── Season utility ─── */
function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month === 1 || month === 2) return { name: "Spring", ayurvedic: "Vasanta Ritu", emoji: "🌸", dominantDosha: "Kapha", advice: "Favor light, dry, warm foods. Include bitter & astringent tastes. Use honey, barley, ginger, turmeric." };
  if (month === 3 || month === 4) return { name: "Summer", ayurvedic: "Grishma Ritu", emoji: "☀️", dominantDosha: "Pitta", advice: "Favor sweet, cold, liquid foods. Include cooling herbs like mint, coriander, fennel." };
  if (month === 5 || month === 6) return { name: "Monsoon", ayurvedic: "Varsha Ritu", emoji: "🌧️", dominantDosha: "Vata", advice: "Favor warm, freshly cooked, easily digestible foods. Use ginger, garlic, asafoetida." };
  if (month === 7 || month === 8) return { name: "Autumn", ayurvedic: "Sharad Ritu", emoji: "🍂", dominantDosha: "Pitta", advice: "Favor sweet, bitter, astringent tastes. Include cooling foods like rice, ghee, amla." };
  if (month === 9 || month === 10) return { name: "Early Winter", ayurvedic: "Hemanta Ritu", emoji: "❄️", dominantDosha: "Vata", advice: "Favor heavy, oily, warm, nourishing foods. Include ghee, sesame oil, nuts, jaggery." };
  return { name: "Winter", ayurvedic: "Shishira Ritu", emoji: "🥶", dominantDosha: "Kapha", advice: "Favor warm, cooked, spiced foods. Include ginger, black pepper, cinnamon." };
}

/* ─── Week utilities ─── */
function getWeekStartDate(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftWeek(weekStart: string, direction: -1 | 1): string {
  const parts = weekStart.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + direction * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getWeekDates(weekStart: string) {
  const parts = weekStart.split("-").map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = getWeekStartDate();
  const todayDate = new Date().getDate();
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();
  return DAYS_SHORT.map((dayShort, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const isToday = d.getDate() === todayDate && d.getMonth() === todayMonth && d.getFullYear() === todayYear;
    return { dayShort, date: d.getDate(), month: d.toLocaleString("en-US", { month: "short" }), full: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, isToday };
  });
}

function formatWeekRange(weekStart: string): string {
  const parts = weekStart.split("-").map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startMonth = start.toLocaleString("en-US", { month: "short" });
  const endMonth = end.toLocaleString("en-US", { month: "short" });
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
}

function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStartDate();
}

function isFutureWeek(weekStart: string): boolean {
  return weekStart > getWeekStartDate();
}

function getDayCompletion(dayIdx: number, weekPlan: WeekPlan | null, checkedMeals: Record<string, boolean>): "full" | "partial" | "none" {
  const day = weekPlan?.days?.[dayIdx];
  if (!day?.meals?.length) return "none";
  const checked = day.meals.filter((_, i) => checkedMeals[`${dayIdx}-${i}`]).length;
  if (checked === day.meals.length) return "full";
  if (checked > 0) return "partial";
  return "none";
}

function getFoodImageUrl(keyword?: string, fallbackName?: string): string {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=400&h=300&c=7&rs=1&p=0`;
}

/* ─── In-memory generation tracking ─── */
const pendingGenerations = new Map<string, Promise<any>>();

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function MealPlanPage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const uid = user?.uid || "";

  const [doshaData, setDoshaData] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [viewingWeekStart, setViewingWeekStart] = useState(getWeekStartDate());
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(getTodayIndex());
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState("");
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [favoriteMeals, setFavoriteMeals] = useState<any[]>([]);

  /* Reflection modal */
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionRatings, setReflectionRatings] = useState<Record<string, "liked" | "disliked">>({});
  const [previousWeekPlan, setPreviousWeekPlan] = useState<WeekPlan | null>(null);

  const season = getCurrentSeason();
  const weekDates = getWeekDates(viewingWeekStart);
  const isViewingCurrent = isCurrentWeek(viewingWeekStart);
  const canGoForward = !isFutureWeek(shiftWeek(viewingWeekStart, 1));
  const weekLabel = formatWeekRange(viewingWeekStart);

  const hasDosha = !!doshaData?.doshaType;
  const hasOnboarding = !!onboardingData?.goal;

  /* ─── Subscriptions ─── */
  useEffect(() => {
    if (!uid) return;
    const unsubDosha = firestore.subscribeToDoshaResult(uid, setDoshaData);
    const unsubOnboarding = firestore.subscribeToOnboarding(uid, setOnboardingData);
    const unsubFavorites = firestore.subscribeToFavorites(uid, setFavoriteMeals);
    return () => { unsubDosha(); unsubOnboarding(); unsubFavorites(); };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setInitialLoadDone(false);
    const unsubMealPlan = firestore.subscribeToMealPlanWeek(uid, viewingWeekStart, (data) => {
      setWeekPlan(data?.weekPlan || null);
      setInitialLoadDone(true);
      if (data?.weekPlan) setLoading(false);
    });
    const unsubChecked = firestore.subscribeToCheckedMeals(uid, viewingWeekStart, (data) => {
      setCheckedMeals(data || {});
    });
    return () => { unsubMealPlan(); unsubChecked(); };
  }, [uid, viewingWeekStart]);

  // Resume in-flight generation
  useEffect(() => {
    const pending = pendingGenerations.get(viewingWeekStart);
    if (pending) {
      setLoading(true);
      pending.finally(() => setLoading(false));
    }
  }, [viewingWeekStart]);

  // Auto-select today when viewing current week
  useEffect(() => {
    setSelectedDay(isViewingCurrent ? getTodayIndex() : 0);
  }, [viewingWeekStart]);

  /* ─── Navigation ─── */
  const goToPrevWeek = () => {
    setWeekPlan(null);
    setInitialLoadDone(false);
    setViewingWeekStart(shiftWeek(viewingWeekStart, -1));
  };
  const goToNextWeek = () => {
    const next = shiftWeek(viewingWeekStart, 1);
    if (isFutureWeek(next)) return;
    setWeekPlan(null);
    setInitialLoadDone(false);
    setViewingWeekStart(next);
  };

  /* ─── Generate Plan ─── */
  const handleGenerate = async (liked?: string[], disliked?: string[]) => {
    if (pendingGenerations.has(viewingWeekStart)) return;
    setLoading(true);
    setError("");

    const allFavs = liked ? [...new Set([...favoriteMeals.map((f: any) => f.name || f), ...liked])] : favoriteMeals.map((f: any) => f.name || f);

    const generationPromise = (async () => {
      try {
        const prompt = buildMealPlanPrompt(
          doshaData?.doshaType,
          doshaData?.aiAnalysis,
          onboardingData?.goal,
          onboardingData?.weight,
          onboardingData?.height,
          onboardingData?.age,
          onboardingData?.diet,
          onboardingData?.region,
          season,
          allFavs.length > 0 ? allFavs : undefined,
          disliked && disliked.length > 0 ? disliked : undefined,
          weekLabel
        );
        const result = await callLLM(prompt, 8000);
        const parsed = extractAndParseJSON(result);
        if (uid) {
          await firestore.saveMealPlan(uid, parsed, viewingWeekStart);
          await firestore.saveCheckedMeals(uid, {}, viewingWeekStart);
        }
        return parsed;
      } finally {
        pendingGenerations.delete(viewingWeekStart);
      }
    })();

    pendingGenerations.set(viewingWeekStart, generationPromise);

    try {
      const parsed = await generationPromise;
      setWeekPlan(parsed);
      setSelectedDay(getTodayIndex());
      setCheckedMeals({});
    } catch (e: any) {
      setError(e?.message || "Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Check if reflection needed */
  const startGeneration = async () => {
    const prevWeek = shiftWeek(viewingWeekStart, -1);
    try {
      const prevData = await firestore.subscribeToMealPlanWeek(uid, prevWeek, () => {}) as any;
      // We can't await subscriptions easily, just generate directly
    } catch {}
    handleGenerate();
  };

  /* With feedback */
  const handleGenerateWithFeedback = () => {
    setShowReflection(false);
    const liked = Object.entries(reflectionRatings).filter(([, v]) => v === "liked").map(([k]) => k);
    const disliked = Object.entries(reflectionRatings).filter(([, v]) => v === "disliked").map(([k]) => k);
    const prevWeek = shiftWeek(viewingWeekStart, -1);
    if (uid && (liked.length > 0 || disliked.length > 0)) {
      firestore.saveWeekFeedback(uid, prevWeek, { liked, disliked });
    }
    handleGenerate(liked, disliked);
  };

  /* ─── Meal Actions ─── */
  const toggleMealCheck = (dayIdx: number, mealIdx: number) => {
    if (!uid) return;
    const key = `${dayIdx}-${mealIdx}`;
    const updated = { ...checkedMeals, [key]: !checkedMeals[key] };
    setCheckedMeals(updated);
    firestore.saveCheckedMeals(uid, updated, viewingWeekStart);
  };

  const toggleFavorite = (meal: Meal) => {
    if (!uid) return;
    const isFav = favoriteMeals.some((f: any) => (f.name || f) === meal.name);
    const updated = isFav ? favoriteMeals.filter((f: any) => (f.name || f) !== meal.name) : [...favoriteMeals, meal];
    setFavoriteMeals(updated);
    firestore.saveFavoriteMeals(uid, updated);
  };

  /* ─── Computed ─── */
  const currentDay = weekPlan?.days?.[selectedDay];
  const completedToday = currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`]).length || 0;
  const totalMeals = currentDay?.meals?.length || 0;
  const consumedCal = currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`]).reduce((s, m) => s + m.calories, 0) || 0;
  const consumedProtein = currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`]).reduce((s, m) => s + (m.protein || 0), 0) || 0;
  const consumedCarbs = currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`]).reduce((s, m) => s + (m.carbs || 0), 0) || 0;
  const consumedFat = currentDay?.meals?.filter((_, i) => checkedMeals[`${selectedDay}-${i}`]).reduce((s, m) => s + (m.fat || 0), 0) || 0;
  const targetProtein = currentDay?.meals?.reduce((a, m) => a + (m.protein || 0), 0) || 0;
  const targetCarbs = currentDay?.meals?.reduce((a, m) => a + (m.carbs || 0), 0) || 0;
  const targetFat = currentDay?.meals?.reduce((a, m) => a + (m.fat || 0), 0) || 0;

  const weekTotalMeals = weekPlan?.days?.reduce((s, d) => s + (d.meals?.length || 0), 0) || 0;
  const weekCompletedMeals = weekPlan?.days
    ? weekPlan.days.reduce((sum, _, dayIdx) => sum + (weekPlan.days[dayIdx]?.meals?.filter((_, mi) => checkedMeals[`${dayIdx}-${mi}`]).length || 0), 0)
    : 0;

  /* ─── Loading State ─── */
  if (!initialLoadDone) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
        <HeaderBar colors={colors} isDark={isDark} weekPlan={null} doshaData={doshaData} isViewingCurrent={isViewingCurrent} loading={loading} onRegen={() => {}} />
        <CalendarStrip colors={colors} isDark={isDark} weekDates={weekDates} selectedDay={selectedDay} onSelectDay={setSelectedDay} weekLabel={weekLabel} isViewingCurrent={isViewingCurrent} canGoForward={canGoForward} onPrev={goToPrevWeek} onNext={goToNextWeek} weekPlan={weekPlan} checkedMeals={checkedMeals} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: colors.gold, borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: colors.textMuted }}>Loading meal plan...</p>
        </div>
      </div>
    );
  }

  /* ─── Empty State: Current Week ─── */
  if (!weekPlan && isViewingCurrent) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
        <HeaderBar colors={colors} isDark={isDark} weekPlan={null} doshaData={doshaData} isViewingCurrent={isViewingCurrent} loading={loading} onRegen={() => {}} />
        <CalendarStrip colors={colors} isDark={isDark} weekDates={weekDates} selectedDay={selectedDay} onSelectDay={setSelectedDay} weekLabel={weekLabel} isViewingCurrent={isViewingCurrent} canGoForward={canGoForward} onPrev={goToPrevWeek} onNext={goToNextWeek} weekPlan={weekPlan} checkedMeals={checkedMeals} />

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {/* New Week Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6 mb-4 text-center border" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, boxShadow: `0 4px 20px ${isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)"}` }}>
            <div className="text-5xl mb-3">🌱</div>
            <h2 className="text-xl font-black mb-1" style={{ color: colors.text }}>New Week — {weekLabel}</h2>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>Generate your personalized Ayurvedic meal plan for this week</p>

            {/* Seasonal Badge */}
            <div className="flex items-center gap-3 rounded-2xl p-3 mb-4 border mx-auto max-w-sm" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }}>
              <span className="text-2xl">{season.emoji}</span>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: colors.text }}>{season.ayurvedic} ({season.name})</p>
                <p className="text-xs" style={{ color: colors.textMuted }}>{season.dominantDosha}-balancing meals</p>
              </div>
            </div>

            {favoriteMeals.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-4 px-3 py-2 rounded-xl mx-auto w-fit" style={{ backgroundColor: "rgba(168,114,8,0.08)" }}>
                <Heart className="w-3 h-3" style={{ color: "#A87208" }} />
                <span className="text-xs font-semibold" style={{ color: "#A87208" }}>Carrying over {favoriteMeals.length} favorite{favoriteMeals.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </motion.div>

          {/* Step 1: Dosha */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-4 mb-3 border" style={{ backgroundColor: hasDosha ? colors.successBg || "rgba(16,185,129,0.08)" : colors.card, borderColor: hasDosha ? "rgba(16,185,129,0.25)" : colors.cardBorder }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black" style={{ backgroundColor: hasDosha ? "#10B981" : colors.gold, color: hasDosha ? "#fff" : "#1B4332" }}>
                {hasDosha ? "✓" : "1"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: colors.text }}>Dosha Assessment</p>
                <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {hasDosha ? `Your dosha: ${doshaData?.doshaType} — meals will be tailored to balance it` : "Take the quiz to get dosha-specific meals"}
                </p>
              </div>
            </div>
            {!hasDosha && (
              <Link href="/dashboard/dosha" className="mt-3 flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl w-fit" style={{ backgroundColor: colors.surface, color: colors.text }}>
                Take Assessment →
              </Link>
            )}
          </motion.div>

          {/* Step 2: Health Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-4 mb-4 border" style={{ backgroundColor: hasOnboarding ? "rgba(16,185,129,0.08)" : colors.card, borderColor: hasOnboarding ? "rgba(16,185,129,0.25)" : colors.cardBorder }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black" style={{ backgroundColor: hasOnboarding ? "#10B981" : colors.gold, color: hasOnboarding ? "#fff" : "#1B4332" }}>
                {hasOnboarding ? "✓" : "2"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: colors.text }}>Health Profile</p>
                <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                  {hasOnboarding ? `Goal: ${onboardingData?.goal} · ${onboardingData?.weight}kg · ${onboardingData?.height}cm` : "Set weight, height & fitness goal"}
                </p>
              </div>
            </div>
            {!hasOnboarding && (
              <Link href="/dashboard/profile" className="mt-3 flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl w-fit" style={{ backgroundColor: colors.surface, color: colors.text }}>
                Set Preferences →
              </Link>
            )}
          </motion.div>

          {/* Generate Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            onClick={startGeneration}
            disabled={loading || !hasDosha}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 disabled:opacity-60 mb-3"
            style={{ backgroundColor: !hasDosha ? colors.divider : colors.primaryBtn, color: !hasDosha ? colors.textMuted : colors.primaryBtnText, boxShadow: hasDosha ? `0 8px 24px ${colors.primaryBtn}40` : "none" }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                AI is cooking your plan...
              </>
            ) : hasDosha ? (
              <>
                <Sparkles className="w-5 h-5" />
                Generate {doshaData?.doshaType} Plan ✨
              </>
            ) : "Wait for Assessment 🧘"}
          </motion.button>

          {!hasDosha && <p className="text-center text-xs" style={{ color: colors.textMuted }}>💡 Take the Dosha Assessment first for a deeply personalized plan</p>}

          {error && (
            <div className="rounded-2xl p-3 mt-3 border" style={{ backgroundColor: colors.errorBg, borderColor: "rgba(239,68,68,0.15)" }}>
              <p className="text-sm" style={{ color: colors.errorText }}>{error}</p>
            </div>
          )}
        </div>

        {/* Reflection Modal */}
        <ReflectionModal show={showReflection} onClose={() => setShowReflection(false)} previousWeekPlan={previousWeekPlan} reflectionRatings={reflectionRatings} setReflectionRatings={setReflectionRatings} onGenerate={handleGenerateWithFeedback} onSkip={() => { setShowReflection(false); handleGenerate(); }} colors={colors} isDark={isDark} />
      </div>
    );
  }

  /* ─── Empty State: Past Week ─── */
  if (!weekPlan && !isViewingCurrent) {
    return (
      <div className="flex flex-col w-full min-w-0" style={{ backgroundColor: colors.background }}>
        <HeaderBar colors={colors} isDark={isDark} weekPlan={null} doshaData={doshaData} isViewingCurrent={isViewingCurrent} loading={loading} onRegen={() => {}} />
        <CalendarStrip colors={colors} isDark={isDark} weekDates={weekDates} selectedDay={selectedDay} onSelectDay={setSelectedDay} weekLabel={weekLabel} isViewingCurrent={isViewingCurrent} canGoForward={canGoForward} onPrev={goToPrevWeek} onNext={goToNextWeek} weekPlan={weekPlan} checkedMeals={checkedMeals} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <span className="text-5xl opacity-40">📅</span>
          <h3 className="text-xl font-bold" style={{ color: colors.text }}>No Plan This Week</h3>
          <p className="text-sm text-center" style={{ color: colors.textMuted }}>No meal plan was generated for {weekLabel}</p>
          <button onClick={() => setViewingWeekStart(getWeekStartDate())} className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ backgroundColor: colors.primaryBtn, color: colors.primaryBtnText }}>
            Go to Current Week →
          </button>
        </div>
      </div>
    );
  }

  /* ─── PLAN VIEW ─── */
  const calProgress = currentDay?.totalCalories ? consumedCal / currentDay.totalCalories : 0;
  const circumference = 2 * Math.PI * 48;

  return (
    <div className="flex flex-col w-full min-w-0" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <HeaderBar
        colors={colors} isDark={isDark} weekPlan={weekPlan} doshaData={doshaData}
        isViewingCurrent={isViewingCurrent} loading={loading}
        onRegen={startGeneration}
      />

      {/* Calendar Strip */}
      <CalendarStrip
        colors={colors} isDark={isDark} weekDates={weekDates} selectedDay={selectedDay}
        onSelectDay={setSelectedDay} weekLabel={weekLabel} isViewingCurrent={isViewingCurrent}
        canGoForward={canGoForward} onPrev={goToPrevWeek} onNext={goToNextWeek}
        weekPlan={weekPlan} checkedMeals={checkedMeals}
      />

      {/* Body */}
      <div className="flex-1 p-2 lg:p-4 pb-6 space-y-4 w-full min-w-0 max-w-4xl mx-auto">

        {/* Week Progress */}
        {isViewingCurrent && weekTotalMeals > 0 && (
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)", borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.15)" }}>
                <Check className="w-4 h-4" style={{ color: "#10B981" }} />
              </div>
              <span className="font-semibold text-sm flex-1" style={{ color: colors.text }}>{weekCompletedMeals} of {weekTotalMeals} meals completed</span>
              <span className="font-black text-sm" style={{ color: "#10B981" }}>{Math.round((weekCompletedMeals / weekTotalMeals) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: "#10B981", width: `${Math.min((weekCompletedMeals / weekTotalMeals) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Seasonal Badge */}
        {isViewingCurrent && (
          <div className="flex items-center gap-3 rounded-2xl p-3 border" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }}>
            <span className="text-2xl">{season.emoji}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: colors.text }}>{season.ayurvedic} ({season.name})</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>{season.dominantDosha}-balancing meals</p>
            </div>
          </div>
        )}

        {/* Dosha Note */}
        {weekPlan?.doshaNote && (
          <div className="flex items-start gap-3 rounded-2xl p-4 border" style={{ backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)", borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)" }}>
            <span className="text-lg mt-0.5">🧘</span>
            <p className="text-sm font-medium" style={{ color: isDark ? "#6EE7B7" : "#065F46" }}>{weekPlan.doshaNote}</p>
          </div>
        )}

        {/* Day Header + Progress */}
        <AnimatePresence mode="wait">
          <motion.div key={selectedDay} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black" style={{ color: colors.text }}>{weekDates[selectedDay]?.dayShort ? DAYS_FULL[selectedDay] : currentDay?.day}</h2>
                <p className="text-sm" style={{ color: colors.textMuted }}>{weekDates[selectedDay]?.month} {weekDates[selectedDay]?.date}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)", borderColor: isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.15)" }}>
                <Check className="w-4 h-4" style={{ color: "#10B981" }} />
                <span className="font-black text-sm" style={{ color: "#10B981" }}>{completedToday}/{totalMeals}</span>
              </div>
            </div>

            {/* Calorie Ring Card */}
            <div className="rounded-3xl p-5 border" style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, boxShadow: `0 4px 20px ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)"}` }}>
              <div className="flex items-center gap-5">
                {/* SVG Ring */}
                <div className="relative flex-shrink-0 w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="48" fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth="8" />
                    <circle cx="56" cy="56" r="48" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${calProgress * circumference} ${circumference}`}
                      style={{ transition: "stroke-dasharray 0.5s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black" style={{ color: colors.text }}>{consumedCal}</span>
                    <span className="text-xs font-bold" style={{ color: colors.textMuted }}>kcal</span>
                  </div>
                </div>

                {/* Macro bars */}
                <div className="flex-1 space-y-3">
                  {[
                    { icon: "💪", label: "Prot", consumed: consumedProtein, target: targetProtein, color: "#EF4444" },
                    { icon: "🌾", label: "Carbs", consumed: consumedCarbs, target: targetCarbs, color: "#F59E0B" },
                    { icon: "🥑", label: "Fat", consumed: consumedFat, target: targetFat, color: "#10B981" },
                  ].map((macro) => (
                    <div key={macro.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{macro.icon}</span>
                          <span className="text-xs font-semibold" style={{ color: colors.textSecondary }}>{macro.label}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: colors.text }}>
                          {macro.consumed}g <span className="font-normal" style={{ color: colors.textMuted }}>/ {macro.target}g</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: macro.color, width: `${macro.target > 0 ? Math.min((macro.consumed / macro.target) * 100, 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs" style={{ color: colors.textMuted }}>Remaining</span>
                    <span className="text-xs font-black" style={{ color: "#F59E0B" }}>{(currentDay?.totalCalories || 0) - consumedCal} kcal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meal Timeline */}
            <div className="space-y-1">
              {currentDay?.meals?.map((meal, i) => {
                const checked = checkedMeals[`${selectedDay}-${i}`];
                const color = MEAL_COLORS[meal.type] || colors.gold;
                const isFav = favoriteMeals.some((f: any) => (f.name || f) === meal.name);
                const isLast = i === (currentDay?.meals?.length || 1) - 1;

                return (
                  <div key={i} className="flex gap-3">
                    {/* Timeline gutter */}
                    <div className="flex flex-col items-center pt-4">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: checked ? "#10B981" : color, borderColor: checked ? "#10B981" : color }}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 my-1 min-h-[20px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />}
                    </div>

                    {/* Meal Card */}
                    <Link
                      href={`/dashboard/meal-detail?meal=${encodeURIComponent(JSON.stringify(meal))}`}
                      className="flex-1 rounded-2xl border mb-3 overflow-hidden block"
                      style={{ backgroundColor: checked ? (isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)") : colors.card, borderColor: checked ? (isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.2)") : colors.cardBorder, boxShadow: `0 2px 12px ${isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.04)"}` }}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}>
                          {meal.emoji} {meal.type}
                        </span>
                        <span className="text-xs flex items-center gap-1" style={{ color: colors.textMuted }}>
                          <Clock className="w-3 h-3" />{meal.time}
                        </span>
                        <div className="flex-1" />
                        {isViewingCurrent && (
                          <>
                            <button onClick={(e) => { e.preventDefault(); toggleFavorite(meal); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.surface }}>
                              <Heart className="w-4 h-4" fill={isFav ? "#EF4444" : "none"} color={isFav ? "#EF4444" : colors.textMuted} />
                            </button>
                            <button onClick={(e) => { e.preventDefault(); toggleMealCheck(selectedDay, i); }} className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: checked ? "#10B981" : colors.surface, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }}>
                              <Check className="w-4 h-4" color={checked ? "#fff" : colors.text} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Image + Info */}
                      <div className="flex gap-3 px-4 py-3">
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          <img
                            src={getFoodImageUrl(meal.imageKeyword, meal.name)}
                            alt={meal.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm leading-snug mb-1" style={{ color: colors.text, textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>
                            {meal.name}
                          </h3>
                          <p className="text-xs leading-relaxed mb-2" style={{ color: colors.textMuted }}>{meal.description}</p>
                        </div>
                      </div>

                      {/* Macro Pills */}
                      <div className="flex flex-wrap gap-2 px-4 pb-3">
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                          🔥 {meal.calories} kcal
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.12)", color: colors.text }}>
                          💪 {meal.protein}g
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.12)", color: colors.text }}>
                          🌾 {meal.carbs}g
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ backgroundColor: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.12)", color: colors.text }}>
                          🥑 {meal.fat}g
                        </span>
                      </div>

                      {/* View details */}
                      <div className="flex items-center gap-1 px-4 pb-3">
                        <span className="text-xs" style={{ color: colors.textMuted }}>View details</span>
                        <ChevronRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl p-3 border" style={{ backgroundColor: colors.errorBg, borderColor: "rgba(239,68,68,0.15)" }}>
                <p className="text-sm" style={{ color: colors.errorText }}>{error}</p>
              </div>
            )}

            {/* AI Generating overlay */}
            {loading && (
              <div className="rounded-2xl p-4 border flex items-center gap-3" style={{ backgroundColor: isDark ? "rgba(212,162,78,0.08)" : "rgba(212,162,78,0.06)", borderColor: isDark ? "rgba(212,162,78,0.15)" : "rgba(212,162,78,0.12)" }}>
                <RefreshCw className="w-5 h-5 animate-spin" style={{ color: colors.gold }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: colors.text }}>AI is generating your plan...</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Cooking up personalized Ayurvedic meals</p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Reflection Modal */}
      <ReflectionModal
        show={showReflection}
        onClose={() => setShowReflection(false)}
        previousWeekPlan={previousWeekPlan}
        reflectionRatings={reflectionRatings}
        setReflectionRatings={setReflectionRatings}
        onGenerate={handleGenerateWithFeedback}
        onSkip={() => { setShowReflection(false); handleGenerate(); }}
        colors={colors}
        isDark={isDark}
      />
    </div>
  );
}

/* ─── Sub-components ─── */
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function HeaderBar({ colors, isDark, weekPlan, doshaData, isViewingCurrent, loading, onRegen }: any) {
  return (
    <div className="px-4 pt-6 pb-4 flex-shrink-0" style={{ backgroundColor: isDark ? colors.card : colors.headerBg }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black" style={{ color: isDark ? colors.text : colors.textOnHeader }}>
              {weekPlan ? "Meal Plan" : "Your Meal Plan"}
            </h1>
            {doshaData?.doshaType && weekPlan && (
              <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: isDark ? "rgba(253,224,71,0.12)" : "rgba(255,255,255,0.15)", borderColor: isDark ? "rgba(253,224,71,0.25)" : "rgba(255,255,255,0.25)", color: isDark ? colors.gold : colors.textOnHeader }}>
                🧘 {doshaData.doshaType}
              </span>
            )}
          </div>
          {weekPlan ? (
            <div className="flex items-center gap-2">
              <span className="font-black" style={{ color: colors.gold }}>{weekPlan.weeklyCalories?.toLocaleString()}</span>
              <span className="text-sm" style={{ color: isDark ? colors.textSecondary : colors.textOnHeaderSub }}>kcal this week</span>
            </div>
          ) : (
            <p className="text-sm" style={{ color: isDark ? colors.textSecondary : colors.textOnHeaderSub }}>AI-powered Ayurvedic nutrition</p>
          )}
        </div>
        {weekPlan && isViewingCurrent && (
          <button onClick={onRegen} disabled={loading} className="w-11 h-11 rounded-full flex items-center justify-center border disabled:opacity-60" style={{ backgroundColor: isDark ? "rgba(253,224,71,0.10)" : "rgba(255,255,255,0.12)", borderColor: isDark ? "rgba(253,224,71,0.20)" : "rgba(255,255,255,0.20)" }}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" style={{ color: colors.gold }} /> : <RefreshCw className="w-5 h-5" style={{ color: colors.gold }} />}
          </button>
        )}
        {weekPlan && !isViewingCurrent && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: "rgba(168,114,8,0.15)", color: "#A87208" }}>
            🕐 Past
          </span>
        )}
      </div>
      {/* Gold accent line */}
      <div className="h-1 rounded-full opacity-40" style={{ backgroundColor: colors.gold }} />
    </div>
  );
}

function CalendarStrip({ colors, isDark, weekDates, selectedDay, onSelectDay, weekLabel, isViewingCurrent, canGoForward, onPrev, onNext, weekPlan, checkedMeals }: any) {
  return (
    <div className="sticky top-0 z-20 px-4 py-3 flex-shrink-0" style={{ backgroundColor: isDark ? colors.card : colors.headerBg, boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)' }}>
      {/* Week Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)" }}>
          <ChevronLeft className="w-5 h-5" style={{ color: isDark ? colors.text : colors.textOnHeader }} />
        </button>
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: isDark ? colors.text : colors.textOnHeader }}>{weekLabel}</p>
          {isViewingCurrent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: `${colors.gold}25`, color: colors.gold }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: colors.gold }} />
              This Week
            </span>
          )}
        </div>
        <button onClick={onNext} disabled={!canGoForward} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)" }}>
          <ChevronRight className="w-5 h-5" style={{ color: isDark ? colors.text : colors.textOnHeader }} />
        </button>
      </div>

      {/* Day cells */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {weekDates.map((d: any, i: number) => {
          const isActive = selectedDay === i;
          const completion = getDayCompletion(i, weekPlan, checkedMeals);
          const completionColor = completion === "full" ? "#10B981" : completion === "partial" ? "#F59E0B" : "transparent";
          return (
            <button
              key={i}
              onClick={() => onSelectDay(i)}
              className="flex-shrink-0 w-14 py-3 rounded-2xl flex flex-col items-center gap-0.5 transition-all"
              style={{
                backgroundColor: isActive ? colors.gold : isDark ? colors.surface : "rgba(255,255,255,0.10)",
                boxShadow: isActive ? `0 4px 20px ${colors.gold}40` : "none",
                outline: d.isToday && !isActive ? `2px solid ${colors.gold}` : "none",
              }}
            >
              <span className="text-xs font-bold uppercase" style={{ color: isActive ? "#1B4332" : d.isToday ? colors.gold : isDark ? colors.textMuted : "rgba(255,255,255,0.5)" }}>
                {d.dayShort}
              </span>
              <span className="text-xl font-black" style={{ color: isActive ? "#1B4332" : isDark ? colors.text : colors.textOnHeader }}>
                {d.date}
              </span>
              <div className="w-5 h-1 rounded-full" style={{ backgroundColor: isActive ? (completion !== "none" ? "#1B4332" : "rgba(27,67,50,0.2)") : completionColor }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReflectionModal({ show, onClose, previousWeekPlan, reflectionRatings, setReflectionRatings, onGenerate, onSkip, colors, isDark }: any) {
  if (!show) return null;
  const meals = previousWeekPlan?.days?.flatMap((d: DayPlan) => d.meals).slice(0, 12) || [];
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-lg rounded-3xl p-6 max-h-[80vh] flex flex-col" style={{ backgroundColor: colors.card }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black" style={{ color: colors.text }}>How was last week?</h3>
                <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>Rate meals to help AI personalize your new plan</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.surface }}>
                <X className="w-5 h-5" style={{ color: colors.text }} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 mb-4">
              {meals.map((meal: Meal, i: number) => {
                const rating = reflectionRatings[meal.name];
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: colors.cardBorder }}>
                    <span className="text-lg">{meal.emoji}</span>
                    <span className="flex-1 text-sm font-semibold truncate" style={{ color: colors.text }}>{meal.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReflectionRatings((p: any) => ({ ...p, [meal.name]: p[meal.name] === "liked" ? undefined : "liked" }))}
                        className="w-9 h-9 rounded-full flex items-center justify-center border transition-all"
                        style={{ backgroundColor: rating === "liked" ? "rgba(16,185,129,0.15)" : colors.surface, borderColor: rating === "liked" ? "rgba(16,185,129,0.3)" : colors.divider }}
                      >
                        <ThumbsUp className="w-4 h-4" style={{ color: rating === "liked" ? "#10B981" : colors.textMuted }} />
                      </button>
                      <button
                        onClick={() => setReflectionRatings((p: any) => ({ ...p, [meal.name]: p[meal.name] === "disliked" ? undefined : "disliked" }))}
                        className="w-9 h-9 rounded-full flex items-center justify-center border transition-all"
                        style={{ backgroundColor: rating === "disliked" ? "rgba(239,68,68,0.15)" : colors.surface, borderColor: rating === "disliked" ? "rgba(239,68,68,0.3)" : colors.divider }}
                      >
                        <ThumbsDown className="w-4 h-4" style={{ color: rating === "disliked" ? "#EF4444" : colors.textMuted }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onGenerate} className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 mb-2" style={{ backgroundColor: colors.primaryBtn, color: colors.primaryBtnText }}>
              <Sparkles className="w-5 h-5" /> Generate Plan ✨
            </button>
            <button onClick={onSkip} className="w-full py-2 text-sm" style={{ color: colors.textMuted }}>
              Skip & Generate Without Feedback
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
