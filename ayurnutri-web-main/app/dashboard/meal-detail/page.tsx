"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { callLLM, extractAndParseJSON } from "@/lib/llm";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Flame,
  Leaf,
  Play,
  RefreshCw,
  Utensils,
  Wind,
  Sparkles,
  Thermometer,
  ShieldCheck,
  Flower,
  FileText,
  Apple,
  Video,
  ChevronLeft,
  Activity,
  Droplet
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface Ingredient {
  name: string;
  quantity: string;
  emoji?: string;
  ayurvedicNote?: string;
}

interface VideoSuggestion {
  title: string;
  channel: string;
  searchQuery: string;
  doshaMatch: number;
  reason: string;
}

interface AyurvedicDetail {
  ingredients: Ingredient[];
  instructions?: string[];
  guna: string;
  virya: string;
  doshaEffect: string;
  rasa: string[];
  preparationTip: string;
  videos: VideoSuggestion[];
}

interface MealData {
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

const TYPE_COLORS: Record<string, string> = {
  "Early Morning": "#F59E0B",
  Breakfast: "#EF4444",
  Lunch: "#10B981",
  Snack: "#8B5CF6",
  Dinner: "#3B82F6",
};

const RASA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Sweet: { bg: "rgba(168,114,8,0.10)", text: "#A87208", border: "rgba(168,114,8,0.22)" },
  Sour: { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", border: "rgba(196,78,28,0.20)" },
  Salty: { bg: "rgba(46,104,176,0.09)", text: "#2E68B0", border: "rgba(46,104,176,0.18)" },
  Pungent: { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", border: "rgba(196,78,28,0.20)" },
  Bitter: { bg: "rgba(54,181,106,0.10)", text: "#36B56A", border: "rgba(54,181,106,0.20)" },
  Astringent: { bg: "rgba(46,104,176,0.09)", text: "#2E68B0", border: "rgba(46,104,176,0.18)" },
};

const MEAL_IMAGES: Record<string, string> = {
  "Early Morning": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80",
  Breakfast: "https://images.unsplash.com/photo-1645177628172-a94c1f96debb?w=800&q=80",
  Lunch: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  Snack: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80",
  Dinner: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
};

const INGREDIENT_EMOJI_MAP: Record<string, string> = {
  "Ginger": "🫚", "Fresh Ginger": "🫚", "Dry Ginger": "🫚",
  "Lemon": "🍋", "Lime": "🍋",
  "Honey": "🍯",
  "Water": "💧", "Warm Water": "💧",
  "Cumin Seeds": "🧂", "Cumin": "🧂", "Jeera": "🧂",
  "Turmeric": "🧂", "Haldi": "🧂",
  "Black Pepper": "🧂", "Pepper": "🧂", "Kali Mirch": "🧂",
  "Salt": "🧂", "Rock Salt": "🧂", "Saindhava Lavana": "🧂",
  "Cinnamon": "🪵", "Dalchini": "🪵",
  "Cardamom": "🟢", "Elaichi": "🟢",
  "Cloves": "🍂", "Laung": "🍂",
  "Mustard Seeds": "⚫", "Mustard": "⚫", "Rai": "⚫",
  "Fenugreek": "🌿", "Methi Seeds": "🌿", "Methi": "🌿",
  "Asafoetida": "🧂", "Hing": "🧂",
  "Saffron": "🌸", "Kesar": "🌸",
  "Nutmeg": "🌰", "Jaiphal": "🌰",
  "Chilli": "🌶️", "Green Chilli": "🌶️", "Red Chilli": "🌶️", "Mirch": "🌶️",
  "Curry Leaves": "🍃", "Kadi Patta": "🍃",
  "Coriander Powder": "🧂", "Dhania Powder": "🧂",
  "Fennel Seeds": "🌿", "Saunf": "🌿",
  "Ghee": "🧈", "Clarified Butter": "🧈",
  "Milk": "🥛", "Cow Milk": "🥛",
  "Yogurt": "🍦", "Curd": "🍦", "Dahi": "🍦", "Buttermilk": "🥛", "Chaas": "🥛",
  "Paneer": "🧀", "Cheese": "🧀",
  "Butter": "🧈",
  "Coconut Oil": "🥥", "Sesame Oil": "🫗", "Mustard Oil": "🫗", "Olive Oil": "🫗",
  "Rice": "🍚", "Basmati Rice": "🍚", "Brown Rice": "🍚", "Poha": "🍚",
  "Wheat": "🌾", "Whole Wheat": "🌾", "Atta": "🌾", "Roti": "🫓", "Chapati": "🫓",
  "Barley": "🌾", "Jau": "🌾",
  "Oats": "🥣", "Oatmeal": "🥣",
  "Quinoa": "🥣",
  "Millet": "🌾", "Bajra": "🌾", "Jowar": "🌾", "Ragi": "🌾",
  "Semolina": "🥣", "Suji": "🥣", "Rava": "🥣",
  "Dal": "🥣", "Lentils": "🥣",
  "Moong Dal": "🥣", "Yellow Mung": "🥣", "Green Mung": "🥣",
  "Toor Dal": "🥣", "Arhar Dal": "🥣",
  "Chana Dal": "🥣", "Bengal Gram": "🥣",
  "Urad Dal": "🥣", "Black Gram": "🥣",
  "Masoor Dal": "🥣", "Red Lentils": "🥣",
  "Chickpeas": "🥙", "Chana": "🥙", "Kabuli Chana": "🥙",
  "Rajma": "🥘", "Kidney Beans": "🥘",
  "Sprouts": "🌱", "Moong Sprouts": "🌱",
  "Spinach": "🥬", "Palak": "🥬",
  "Coriander": "🌿", "Cilantro": "🌿", "Dhania": "🌿",
  "Mint": "🌿", "Pudina": "🌿",
  "Basil": "🌿", "Tulsi": "🌿",
  "Garlic": "🧄", "Lahsun": "🧄",
  "Onion": "🧅", "Pyaz": "🧅",
  "Tomato": "🍅", "Tamatar": "🍅",
  "Potato": "🥔", "Aloo": "🥔",
  "Carrot": "🥕", "Gajar": "🥕",
  "Cucumber": "🥒", "Kheera": "🥒",
  "Broccoli": "🥦",
  "Cauliflower": "🥦", "Gobi": "🥦",
  "Cabbage": "🥬", "Patta Gobi": "🥬",
  "Peas": "🫛", "Matar": "🫛",
  "Okra": "🥒", "Ladyfinger": "🥒", "Bhindi": "🥒",
  "Eggplant": "🍆", "Aubergine": "🍆", "Baingan": "🍆",
  "Bitter Gourd": "🥒", "Karela": "🥒",
  "Bottle Gourd": "🥒", "Lauki": "🥒",
  "Pumpkin": "🎃", "Kaddu": "🎃",
  "Radish": "🥕", "Muli": "🥕",
  "Beetroot": "🧶",
  "Sweet Potato": "🍠", "Shakarkand": "🍠",
  "Apple": "🍎", "Seb": "🍎",
  "Banana": "🍌", "Kela": "🍌",
  "Mango": "🥭", "Aam": "🥭",
  "Orange": "🍊", "Santra": "🍊",
  "Grapes": "🍇", "Angoor": "🍇",
  "Pomegranate": "🍎", "Anar": "🍎",
  "Papaya": "🥭", "Papita": "🥭",
  "Coconut": "🥥", "Nariyal": "🥥",
  "Pineapple": "🍍", "Ananas": "🍍",
  "Watermelon": "🍉", "Tarbooj": "🍉",
  "Dates": "🌴", "Khajur": "🌴",
  "Figs": "🥯", "Anjeer": "🥯",
  "Amla": "🟢", "Gooseberry": "🟢",
  "Nuts": "🥜", "Dry Fruits": "🥜",
  "Almonds": "🥜", "Badam": "🥜",
  "Walnuts": "🥜", "Akhrot": "🥜",
  "Cashews": "🥜", "Kaju": "🥜",
  "Pistachios": "🥜", "Pista": "🥜",
  "Peanuts": "🥜", "Mungfali": "🥜",
  "Sesame": "⚪", "Til": "⚪",
  "Flax Seeds": "🟤", "Alsi": "🟤",
  "Chia Seeds": "🥣",
  "Pumpkin Seeds": "🎃",
  "Sunflower Seeds": "🌻",
  "Sugar": "🍬", "Brown Sugar": "🍬",
  "Jaggery": "🍬", "Gur": "🍬",
  "Tea": "☕", "Chai": "☕", "Green Tea": "🍵",
  "Coffee": "☕",
  "Egg": "🥚", "Anda": "🥚",
  "Chicken": "🍗", "Murgh": "🍗",
  "Fish": "🐟", "Machli": "🐟",
  "Mutton": "🍖", "Meat": "🍖",
};

const getIngredientEmoji = (name: string, aiEmoji?: string) => {
  if (aiEmoji) return aiEmoji;
  const normalized = name.trim();
  if (INGREDIENT_EMOJI_MAP[normalized]) return INGREDIENT_EMOJI_MAP[normalized];
  for (const [key, value] of Object.entries(INGREDIENT_EMOJI_MAP)) {
      if (normalized.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return "🌿";
};

function getFoodImageUrl(keyword?: string, fallbackName?: string, mealType?: string): string {
  const term = keyword || fallbackName;
  if (term) {
    return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=800&h=400&c=7&rs=1&p=0`;
  }
  return MEAL_IMAGES[mealType || "Lunch"];
}

function buildMealDetailPrompt(mealName: string, mealType: string, doshaType?: string): string {
  return `You are an expert Ayurvedic nutritionist. Provide detailed Ayurvedic information about "${mealName}" (${mealType}) for a ${doshaType || "Tridosha"} constitution.

Return ONLY a JSON object with this exact structure:
{
  "ingredients": [
    { "name": "ingredient name", "quantity": "amount", "emoji": "emoji", "ayurvedicNote": "benefit" }
  ],
  "instructions": ["step 1", "step 2"],
  "guna": "quality (e.g., Light, Heavy)",
  "virya": "potency (Heating/Cooling)",
  "doshaEffect": "effect on doshas",
  "rasa": ["Sweet", "Sour"],
  "preparationTip": "special tip",
  "videos": [
    { "title": "video title", "channel": "channel name", "searchQuery": "search terms", "doshaMatch": 85, "reason": "why recommended" }
  ]
}`;
}

const getMatchColor = (score: number) => {
  if (score >= 70) return { bg: "rgba(54,181,106,0.10)", text: "#36B56A", bar: "#36B56A" };
  if (score >= 45) return { bg: "rgba(168,114,8,0.10)", text: "#A87208", bar: "#A87208" };
  return { bg: "rgba(196,78,28,0.10)", text: "#C44E1C", bar: "#C44E1C" };
};

function MealDetailContent() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"overview" | "ingredients" | "videos">("overview");
  const [detail, setDetail] = useState<AyurvedicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [doshaType, setDoshaType] = useState<string | undefined>(undefined);
  const [doshaLoaded, setDoshaLoaded] = useState(false);
  const [aiError, setAiError] = useState(false);

  let meal: MealData;
  try {
    const mealParam = searchParams.get("meal");
    meal = mealParam ? JSON.parse(decodeURIComponent(mealParam)) : {} as MealData;
  } catch {
    meal = {} as MealData;
  }

  const typeColor = TYPE_COLORS[meal.type] || colors.gold;
  const totalMacro = (meal.protein || 0) * 4 + (meal.carbs || 0) * 4 + (meal.fat || 0) * 9 || 1;
  const proteinPct = Math.round(((meal.protein || 0) * 4 / totalMacro) * 100);
  const carbsPct = Math.round(((meal.carbs || 0) * 4 / totalMacro) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  useEffect(() => {
    if (!user?.uid || !meal.name) return;

    const fetchData = async () => {
      const doshaData = await firestore.getDoshaResult(user.uid);
      const dType = doshaData?.doshaType;
      setDoshaType(dType);
      setDoshaLoaded(true);

      const cached = await firestore.getMealDetail(meal.name, dType);
      if (cached) {
        setDetail(cached as AyurvedicDetail);
        setLoading(false);
      } else {
        try {
          const prompt = buildMealDetailPrompt(meal.name, meal.type, dType);
          const result = await callLLM(prompt, 4000);
          const parsed = extractAndParseJSON(result);
          setDetail(parsed as AyurvedicDetail);
          await firestore.saveMealDetail(user.uid, meal.name, parsed, dType);
        } catch (e) {
          console.error("AI generation failed:", e);
          setAiError(true);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [meal.name, user?.uid]);

  const handleRegenerate = async () => {
    if (!user?.uid || !meal.name || loading) return;
    setLoading(true);
    setDetail(null);
    setAiError(false);
    
    try {
      const prompt = buildMealDetailPrompt(meal.name, meal.type, doshaType);
      const result = await callLLM(prompt, 4000);
      const parsed = extractAndParseJSON(result);
      setDetail(parsed as AyurvedicDetail);
      await firestore.saveMealDetail(user.uid, meal.name, parsed, doshaType);
    } catch (e) {
      console.error("Regenerate failed:", e);
      setAiError(true);
    } finally {
      setLoading(false);
    }
  };

  const openYouTube = (query: string) => {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
  };

  if (!meal.name) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <p style={{ color: colors.textMuted }}>No meal data found</p>
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-bold"
            style={{ backgroundColor: colors.gold, color: "#1B4332" }}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6 w-full overflow-x-hidden lg:overflow-visible relative" style={{ backgroundColor: colors.background }}>
      {/* ─── Hero Header with Food Image ─── */}
      <div 
        className="relative w-full h-[320px] bg-cover bg-center rounded-b-[32px] overflow-hidden" 
        style={{ backgroundImage: `url('${getFoodImageUrl(meal.imageKeyword || meal.name, meal.name, meal.type)}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute inset-0 flex flex-col pt-6 px-6 pb-7">
          <div className="flex items-center justify-between mb-auto z-10 pt-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center border transition-opacity"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.20)" }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRegenerate}
                className="w-10 h-10 rounded-full flex items-center justify-center border transition-opacity"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.20)" }}
              >
                <RefreshCw className={`w-[18px] h-[18px] text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-4 py-2 rounded-[22px] border flex items-center gap-1.5" style={{ backgroundColor: `${typeColor}E8`, borderColor: "rgba(255,255,255,0.18)" }}>
                <span className="text-[13px]">{meal.emoji}</span>
                <span className="text-[11px] font-[800] text-white tracking-[1px] uppercase">{meal.type}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center z-10 mt-auto">
            <h1 className="text-[24px] font-[900] text-white leading-[32px] text-center mb-2" style={{ textShadow: "0px 2px 6px rgba(0,0,0,0.6)" }}>
              {meal.name}
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] border" style={{ backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}>
                <Clock className="w-[13px] h-[13px] text-white/90" />
                <span className="text-[12px] font-[700] text-white/90">{meal.time}</span>
              </div>
              {detail?.doshaEffect && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] border" style={{ backgroundColor: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.25)" }}>
                  <CheckCircle className="w-[13px] h-[13px] text-[#4ADE80]" />
                  <span className="text-[12px] font-[700] text-white">{detail.doshaEffect}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Macro Pills ─── */}
      <div className="flex px-4 py-0 -mt-5 mb-2 relative z-20 gap-2">
        {[
          { label: "KCAL", value: meal.calories || 0, color: "#A87208", icon: Flame },
          { label: "PROTEIN", value: `${meal.protein || 0}g`, color: "#2E68B0", icon: Activity },
          { label: "CARBS", value: `${meal.carbs || 0}g`, color: "#36B56A", icon: Leaf },
          { label: "FAT", value: `${meal.fat || 0}g`, color: "#C44E1C", icon: Droplet },
        ].map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3.5 px-2 rounded-[14px] border-t-[2.5px] border-x border-b shadow-sm" style={{ backgroundColor: colors.card, borderTopColor: m.color, borderColor: "rgba(0,0,0,0.04)" }}>
            <m.icon className="w-[14px] h-[14px] mb-0.5" style={{ color: m.color }} />
            <span className="text-[18px] font-[900]" style={{ color: m.color }}>{m.value}</span>
            <span className="text-[8px] font-[700] tracking-[1px] mt-[3px]" style={{ color: colors.textMuted }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex border-b px-4 mt-2" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
        {[
          { key: "overview" as const, label: "Overview", icon: FileText },
          { key: "ingredients" as const, label: "Ingredients", icon: Utensils },
          { key: "videos" as const, label: "Videos", icon: Video },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-3.5 flex flex-col items-center gap-1 relative"
          >
            <tab.icon className="w-4 h-4" style={{ color: activeTab === tab.key ? typeColor : colors.textMuted }} />
            <span 
              className={`text-[13px] ${activeTab === tab.key ? 'font-[800]' : 'font-[600]'}`}
              style={{ color: activeTab === tab.key ? typeColor : colors.textMuted }}
            >
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-current" style={{ color: typeColor }} />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="px-[18px] pt-[18px] pb-6">
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Description Card */}
            <div className="p-4 rounded-[16px] flex gap-3 items-start border mb-[18px]" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.05)" }}>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${typeColor}15` }}>
                <Sparkles className="w-4 h-4" style={{ color: typeColor }} />
              </div>
              <p className="text-[14px] leading-[22px] font-[500] flex-1" style={{ color: isDark ? colors.textMuted : colors.text }}>
                {meal.description}
              </p>
            </div>

            {/* Nutrition Breakdown */}
            <div className="flex items-center gap-2 mb-2.5 mt-3.5">
              <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
              <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>NUTRITION BREAKDOWN</h3>
            </div>
            <div className="p-4 rounded-[18px] mb-1 shadow-sm border" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.03)" }}>
              {[
                { name: "Protein", pct: proteinPct, val: `${meal.protein || 0}g`, color: "#2E68B0", icon: Activity },
                { name: "Carbs", pct: carbsPct, val: `${meal.carbs || 0}g`, color: "#36B56A", icon: Leaf },
                { name: "Fat", pct: fatPct, val: `${meal.fat || 0}g`, color: "#C44E1C", icon: Droplet },
              ].map((n, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-[5px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[22px] h-[22px] rounded-md flex items-center justify-center" style={{ backgroundColor: `${n.color}15` }}>
                        <n.icon className="w-3 h-3" style={{ color: n.color }} />
                      </div>
                      <span className="font-[700] text-[12px]" style={{ color: colors.text }}>{n.name}</span>
                    </div>
                    <span className="text-[11px]" style={{ color: colors.textMuted }}>{n.val} · {n.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#222" : "#F3F4F6" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(n.pct, 100)}%`, backgroundColor: n.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Loading / Error States */}
            {(!doshaLoaded || loading) && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 animate-pulse" style={{ backgroundColor: `${typeColor}15` }}>
                  <div className="w-6 h-6 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: typeColor, borderTopColor: 'transparent' }} />
                </div>
                <p className="text-[13px] font-[600] mt-1" style={{ color: colors.textMuted }}>
                  {!doshaLoaded ? "Loading your dosha profile..." : "Generating Ayurvedic analysis..."}
                </p>
                <p className="text-[11px] mt-0.5 opacity-60" style={{ color: colors.textMuted }}>This may take a few moments</p>
              </div>
            )}
            
            {!loading && aiError && !detail && (
              <div className="flex flex-col items-center justify-center py-6">
                <Wind className="w-8 h-8 mb-2 opacity-40" style={{ color: colors.textMuted }} />
                <p className="text-[13px] font-[600] text-center mt-2" style={{ color: colors.textMuted }}>
                  AI analysis couldn't be generated right now.<br/>The AI servers may be busy.
                </p>
                <button onClick={handleRegenerate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-[800] mt-3.5 transition-opacity hover:opacity-80 text-[13px]" style={{ backgroundColor: typeColor, color: "#fff" }}>
                  <RefreshCw className="w-4 h-4 text-white" /> Tap to Retry
                </button>
              </div>
            )}

            {/* Ayurvedic Profile */}
            {!loading && detail && (detail.guna || detail.virya || detail.doshaEffect) && (
              <>
                <div className="flex items-center gap-2 mb-2.5 mt-3.5">
                  <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
                  <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>AYURVEDIC PROFILE</h3>
                </div>
                <div className="flex flex-wrap gap-[10px] mb-1">
                  {[
                    { label: "GUNA", value: detail.guna, icon: Flower, color: "#8B5CF6", bg: "rgba(139,92,246,0.10)" },
                    { label: "VIRYA", value: detail.virya, icon: Thermometer, color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
                    { label: "DOSHA EFFECT", value: detail.doshaEffect, icon: ShieldCheck, color: "#10B981", bg: "rgba(16,185,129,0.10)" },
                    { label: "BEST TIME", value: meal.time, icon: Clock, color: "#F59E0B", bg: "rgba(245,158,11,0.10)" }
                  ].map((item, i) => item.value && (
                    <div key={i} className="w-[calc(50%-5px)] p-3.5 rounded-[14px] border-l-[3px]" style={{ backgroundColor: colors.card, borderLeftColor: item.color }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: item.bg }}>
                        <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <p className="text-[8px] font-[800] tracking-[1px] mb-1 uppercase" style={{ color: colors.textMuted }}>{item.label}</p>
                      <p className="text-[13px] font-[700] leading-[18px]" style={{ color: colors.text }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Rasa Tags */}
            {!loading && detail?.rasa && detail.rasa.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2.5 mt-3.5">
                  <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
                  <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>RASA — TASTE PROFILE</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-1">
                  {detail.rasa.map((taste, i) => {
                    const style = RASA_COLORS[taste] || { bg: "rgba(100,100,100,0.1)", text: "#888", border: "rgba(100,100,100,0.2)" };
                    return (
                      <div key={i} className="px-3.5 py-1.5 rounded-[20px] border-[1.5px]" style={{ backgroundColor: style.bg, borderColor: style.border }}>
                        <span className="text-[12px] font-[700]" style={{ color: style.text }}>{taste}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Ayurvedic Tip */}
            {!loading && detail?.preparationTip && (
              <>
                <div className="flex items-center gap-2 mb-2.5 mt-3.5">
                  <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
                  <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>AYURVEDIC TIP</h3>
                </div>
                <div className="p-3.5 rounded-[16px] border border-l-4 flex items-start gap-2.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRightColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderLeftColor: typeColor }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: `${typeColor}15` }}>
                    <span className="text-[16px]">🌿</span>
                  </div>
                  <p className="text-[13px] leading-[21px] font-[500] flex-1" style={{ color: colors.text }}>{detail.preparationTip}</p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ─── Ingredients Tab ─── */}
        {activeTab === "ingredients" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {(!doshaLoaded || loading) ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 animate-pulse" style={{ backgroundColor: `${typeColor}15` }}>
                  <div className="w-6 h-6 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: typeColor, borderTopColor: 'transparent' }} />
                </div>
                <p className="text-[13px] font-[600] mt-1" style={{ color: colors.textMuted }}>
                  {!doshaLoaded ? "Loading your dosha profile..." : "Loading ingredients & recipe..."}
                </p>
                <p className="text-[11px] mt-0.5 opacity-60" style={{ color: colors.textMuted }}>This may take a few moments</p>
              </div>
            ) : detail?.ingredients && detail.ingredients.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-[14px]">
                  <h3 className="text-[16px] font-[800]" style={{ color: colors.text }}>{detail.ingredients.length} Ingredients</h3>
                  <div className="px-3 py-1.5 rounded-[10px]" style={{ backgroundColor: "rgba(54,181,106,0.10)" }}>
                    <span className="text-[#36B56A] text-[11px] font-[700]">✅ Dosha-matched</span>
                  </div>
                </div>
                
                {detail.ingredients.map((ing, i) => {
                  const hasName = !!ing.name?.trim();
                  const hasQty = !!ing.quantity?.trim();
                  const isQtyOnly = !hasName && hasQty;
                  const displayName = isQtyOnly ? ing.quantity : ing.name || "Unknown Ingredient";
                  const displayQty = isQtyOnly ? null : ing.quantity;

                  return (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-[14px] mb-2 border" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.05)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(54,181,106,0.10)" }}>
                        <span className="text-[#36B56A] text-[10px] font-[800]">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[16px]">{getIngredientEmoji(displayName, ing.emoji)}</span>
                          <span className="text-[13px] font-[700] leading-[18px] truncate" style={{ color: colors.text }}>{displayName}</span>
                        </div>
                        {ing.ayurvedicNote && (
                          <p className="text-[10px] mt-1 ml-6 leading-[14px]" style={{ color: colors.textMuted }}>{ing.ayurvedicNote}</p>
                        )}
                      </div>
                      {displayQty && (
                        <div className="shrink-0 max-w-[40%] px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: "rgba(168,114,8,0.10)" }}>
                          <span className="text-[#A87208] text-[11px] font-[800] text-right block truncate">{displayQty}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Instructions */}
                {detail.instructions && detail.instructions.length > 0 && (
                  <>
                    <div className="h-[1px] w-full my-5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                    <div className="flex items-center mb-1">
                      <Utensils className="w-[18px] h-[18px] mr-2" style={{ color: typeColor }} />
                      <h3 className="text-[16px] font-[800]" style={{ color: colors.text }}>How to Prepare</h3>
                    </div>
                    <p className="text-[11px] mb-4 ml-6" style={{ color: colors.textMuted }}>
                      {detail.instructions.length} easy steps to make this dish
                    </p>

                    {detail.instructions.map((step, i) => {
                      const cleanStep = step.replace(/^Step\s*\d+\s*[:.]\s*/i, "");
                      const isLast = i === detail.instructions!.length - 1;
                      return (
                        <div key={i} className="flex min-h-[48px]">
                          <div className="w-8 flex flex-col items-center">
                            <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center z-10" style={{ backgroundColor: typeColor }}>
                              <span className="text-[11px] font-[800] text-white">{i + 1}</span>
                            </div>
                            {!isLast && <div className="w-[2px] flex-1 my-[-1px]" style={{ backgroundColor: `${typeColor}30` }} />}
                          </div>
                          <div className="flex-1 ml-2.5 mb-2.5 p-3.5 rounded-[14px] border" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.05)" }}>
                            <p className="text-[13px] leading-[20px] font-[500]" style={{ color: colors.text }}>{cleanStep}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              <div className="p-[30px] rounded-[20px] flex flex-col items-center border" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                <span className="text-[36px] mb-2.5">📋</span>
                <h3 className="text-[16px] font-[800] mb-1.5" style={{ color: colors.text }}>No Ingredients Data</h3>
                <p className="text-[13px] text-center leading-[20px]" style={{ color: colors.textMuted }}>Could not load ingredient details. Please try again later.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Videos Tab ─── */}
        {activeTab === "videos" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {(!doshaLoaded || loading) ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 animate-pulse" style={{ backgroundColor: `${typeColor}15` }}>
                  <div className="w-6 h-6 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: typeColor, borderTopColor: 'transparent' }} />
                </div>
                <p className="text-[13px] font-[600] mt-1" style={{ color: colors.textMuted }}>
                  {!doshaLoaded ? "Loading your dosha profile..." : "Loading recipe videos..."}
                </p>
                <p className="text-[11px] mt-0.5 opacity-60" style={{ color: colors.textMuted }}>This may take a few moments</p>
              </div>
            ) : detail?.videos && detail.videos.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-[14px]">
                  <h3 className="text-[16px] font-[800]" style={{ color: colors.text }}>🎬 Recipe Videos</h3>
                  <div className="px-2.5 py-1 rounded-[10px] border border-[rgba(54,181,106,0.20)]" style={{ backgroundColor: "rgba(54,181,106,0.10)" }}>
                    <span className="text-[#36B56A] text-[10px] font-[700]">{detail.videos.length} videos · by match</span>
                  </div>
                </div>

                {detail.videos.map((vid, i) => {
                  const mc = getMatchColor(vid.doshaMatch);
                  return (
                    <div key={i} onClick={() => openYouTube(vid.searchQuery)} className="rounded-[18px] overflow-hidden mb-3.5 shadow-sm border cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <div className="h-[160px] relative flex items-center justify-center bg-[#F3F4F6] dark:bg-[#1C1C1E]">
                        <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(220,20,20,0.90)" }}>
                          <Play className="w-[18px] h-[18px] fill-white text-white ml-1" />
                        </div>
                        <div className="absolute top-2.5 left-2.5 w-[26px] h-[26px] rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
                          <span className="text-white text-[10px] font-[800]">{i + 1}</span>
                        </div>
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-[10px]" style={{ backgroundColor: mc.bg }}>
                          <span className="text-[10px] font-[800]" style={{ color: mc.text }}>{vid.doshaMatch}%</span>
                        </div>
                      </div>
                      
                      <div className="p-3.5">
                        <div className="flex gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isDark ? "#333" : "#E5E7EB" }}>
                            <span className="text-white text-[13px] font-[800]">{vid.channel?.charAt(0) || "?"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-[700] leading-[18px] truncate" style={{ color: colors.text }}>{vid.title}</h4>
                            <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>{vid.channel}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="flex-1 h-[5px] rounded-[3px] overflow-hidden" style={{ backgroundColor: isDark ? "#222" : "#F3F4F6" }}>
                            <div className="h-full rounded-[3px]" style={{ width: `${vid.doshaMatch}%`, backgroundColor: mc.bar }} />
                          </div>
                          <span className="text-[10px] font-[800]" style={{ color: colors.textMuted }}>{vid.doshaMatch}% match</span>
                        </div>

                        <div className="rounded-[10px] p-2.5 border-l-[3px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderLeftColor: "rgba(54,181,106,0.20)" }}>
                          <p className="text-[11px] leading-[17px] italic" style={{ color: colors.textMuted }}>{vid.reason}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="p-[30px] rounded-[20px] flex flex-col items-center border" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                <span className="text-[36px] mb-2.5">🎬</span>
                <h3 className="text-[16px] font-[800] mb-1.5" style={{ color: colors.text }}>No Videos Found</h3>
                <p className="text-[13px] text-center leading-[20px]" style={{ color: colors.textMuted }}>Could not load recipe videos. Please try again later.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function MealDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <MealDetailContent />
    </Suspense>
  );
}
