"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Flame,
  Leaf,
  Play,
  Utensils,
  Sparkles,
  Thermometer,
  ShieldCheck,
  Flower,
  FileText,
  Video,
  ChevronLeft,
  Activity,
  Droplet
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

interface Recipe {
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
}

const TYPE_COLORS: Record<string, string> = {
  "Early Morning": "#F59E0B",
  Breakfast: "#EF4444",
  Lunch: "#10B981",
  Snack: "#8B5CF6",
  Dinner: "#3B82F6",
};

const getFoodImageUrl = (keyword?: string, fallbackName?: string): string => {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=800&h=400&c=7&rs=1&p=0`;
};

const INGREDIENT_EMOJI_MAP: Record<string, string> = {
  // Spices & Seasonings
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

  // Fats & Dairy
  "Ghee": "🧈", "Clarified Butter": "🧈",
  "Milk": "🥛", "Cow Milk": "🥛",
  "Yogurt": "🍦", "Curd": "🍦", "Dahi": "🍦", "Buttermilk": "🥛", "Chaas": "🥛",
  "Paneer": "🧀", "Cheese": "🧀",
  "Butter": "🧈",
  "Coconut Oil": "🥥", "Sesame Oil": "🫗", "Mustard Oil": "🫗", "Olive Oil": "🫗",

  // Grains & Flours
  "Rice": "🍚", "Basmati Rice": "🍚", "Brown Rice": "🍚", "Poha": "🍚",
  "Wheat": "🌾", "Whole Wheat": "🌾", "Atta": "🌾", "Roti": "🫓", "Chapati": "🫓",
  "Barley": "🌾", "Jau": "🌾",
  "Oats": "🥣", "Oatmeal": "🥣",
  "Quinoa": "🥣",
  "Millet": "🌾", "Bajra": "🌾", "Jowar": "🌾", "Ragi": "🌾",
  "Semolina": "🥣", "Suji": "🥣", "Rava": "🥣",

  // Pulses & Lentils
  "Dal": "🥣", "Lentils": "🥣",
  "Moong Dal": "🥣", "Yellow Mung": "🥣", "Green Mung": "🥣",
  "Toor Dal": "🥣", "Arhar Dal": "🥣",
  "Chana Dal": "🥣", "Bengal Gram": "🥣",
  "Urad Dal": "🥣", "Black Gram": "🥣",
  "Masoor Dal": "🥣", "Red Lentils": "🥣",
  "Chickpeas": "🥙", "Chana": "🥙", "Kabuli Chana": "🥙",
  "Rajma": "🥘", "Kidney Beans": "🥘",
  "Sprouts": "🌱", "Moong Sprouts": "🌱",

  // Vegetables
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
  "Ash Gourd": "🥒", "Petha": "🥒",
  "Bell Pepper": "🫑", "Capsicum": "🫑", "Shimla Mirch": "🫑",
  "Mushroom": "🍄",

  // Fruits & Nuts
  "Apple": "🍎",
  "Banana": "🍌",
  "Mango": "🥭",
  "Papaya": "🍈",
  "Pomegranate": "🍎", "Anar": "🍎",
  "Grapes": "🍇", "Angoor": "🍇",
  "Dates": "🫘", "Khajoor": "🫘",
  "Raisins": "🍇", "Kishmish": "🍇",
  "Almonds": "🌰", "Badam": "🌰",
  "Cashews": "🥜", "Kaju": "🥜",
  "Walnuts": "🌰", "Akhrot": "🌰",
  "Pistachios": "🥜", "Pista": "🥜",
  "Peanuts": "🥜", "Mungfali": "🥜",
  "Coconut": "🥥", "Nariyal": "🥥",
  "Seeds": "🌻", "Sesame Seeds": "🌻", "Flax Seeds": "🌻", "Pumpkin Seeds": "🎃",

  // Sugars
  "Jaggery": "🟤", "Gud": "🟤",
  "Sugar": "⬜", "Chini": "⬜",
  "Rock Sugar": "🧊", "Mishri": "🧊"
};

const getIngredientEmoji = (name: string, aiSuggested?: string) => {
  if (aiSuggested && aiSuggested !== "") return aiSuggested;
  const n = name.toLowerCase();
  for (const [key, emoji] of Object.entries(INGREDIENT_EMOJI_MAP)) {
    if (n.includes(key.toLowerCase())) return emoji;
  }
  return "🌿";
};

function RecipeDetailContent() {
  const { colors, isDark } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"overview" | "ingredients">("overview");

  let recipe: Recipe;
  try {
    const recipeParam = searchParams.get("recipe");
    recipe = recipeParam ? JSON.parse(decodeURIComponent(recipeParam)) : {} as Recipe;
  } catch {
    recipe = {} as Recipe;
  }

  if (!recipe.name) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <p style={{ color: colors.textMuted }}>No recipe data found</p>
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors.gold, color: "#1B4332" }}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[recipe.mealType] || colors.gold;

  // Derive some macros if not present for layout parity
  const baseProtein = recipe.calories ? Math.round((recipe.calories * 0.15) / 4) : 10;
  const baseCarbs = recipe.calories ? Math.round((recipe.calories * 0.55) / 4) : 45;
  const baseFat = recipe.calories ? Math.round((recipe.calories * 0.3) / 9) : 12;

  const totalMacro = (baseProtein * 4) + (baseCarbs * 4) + (baseFat * 9) || 1;
  const proteinPct = Math.round(((baseProtein * 4) / totalMacro) * 100);
  const carbsPct = Math.round(((baseCarbs * 4) / totalMacro) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  return (
    <div className="w-full min-h-screen lg:max-w-2xl lg:mx-auto lg:rounded-[32px] lg:border pb-6" style={{ backgroundColor: colors.background, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
      {/* ─── Hero Header with Food Image ─── */}
      <div 
        className="relative w-full h-[240px] md:h-[320px] bg-cover bg-center rounded-b-[24px] lg:rounded-t-[32px] lg:rounded-b-[0px] overflow-hidden" 
        style={{ backgroundImage: `url('${getFoodImageUrl(recipe.name, recipe.name)}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="absolute inset-0 flex flex-col pt-4 px-4 pb-6 lg:pt-6 lg:px-6 lg:pb-7">
          <div className="flex items-center justify-between mb-auto z-10 pt-2 lg:pt-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center border transition-opacity hover:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.20)" }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="px-4 py-2 rounded-[22px] border flex items-center gap-1.5" style={{ backgroundColor: `${typeColor}E8`, borderColor: "rgba(255,255,255,0.18)" }}>
              <span className="text-[13px]">{recipe.emoji || "🍽️"}</span>
              <span className="text-[11px] font-[800] text-white tracking-[1px] uppercase">{recipe.mealType || "RECIPE"}</span>
            </div>
          </div>

          <div className="flex flex-col items-center z-10 mt-auto">
            <h1 className="text-[24px] font-[900] text-white leading-[32px] text-center mb-2 px-4" style={{ textShadow: "0px 2px 6px rgba(0,0,0,0.6)" }}>
              {recipe.name}
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {recipe.timeMinutes && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] border" style={{ backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}>
                  <Clock className="w-[13px] h-[13px] text-white/90" />
                  <span className="text-[12px] font-[700] text-white/90">{recipe.timeMinutes} MIN</span>
                </div>
              )}
              {recipe.doshaBalance && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[16px] border" style={{ backgroundColor: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.25)" }}>
                  <CheckCircle className="w-[13px] h-[13px] text-[#4ADE80]" />
                  <span className="text-[12px] font-[700] text-white max-w-[220px] truncate">{recipe.doshaBalance}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Macro Pills ─── */}
      <div className="flex px-4 py-0 -mt-5 mb-2 relative z-20 gap-2">
        {[
          { label: "KCAL", value: recipe.calories || 0, color: "#A87208", icon: Flame },
          { label: "PROTEIN", value: `${baseProtein}g`, color: "#2E68B0", icon: Activity },
          { label: "CARBS", value: `${baseCarbs}g`, color: "#36B56A", icon: Leaf },
          { label: "FAT", value: `${baseFat}g`, color: "#C44E1C", icon: Droplet },
        ].map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-2 lg:py-3.5 px-1 lg:px-2 rounded-[14px] border-t-[2.5px] border-x border-b shadow-sm" style={{ backgroundColor: colors.card, borderTopColor: m.color, borderColor: "rgba(0,0,0,0.04)" }}>
            <m.icon className="w-3 h-3 lg:w-[14px] lg:h-[14px] mb-0.5" style={{ color: m.color }} />
            <span className="text-[14px] lg:text-[18px] font-[900]" style={{ color: m.color }}>{m.value}</span>
            <span className="text-[7px] lg:text-[8px] font-[700] tracking-[1px] mt-[3px]" style={{ color: colors.textMuted }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex border-b px-4 mt-2" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
        {[
          { key: "overview" as const, label: "Overview", icon: FileText },
          { key: "ingredients" as const, label: "Ingredients", icon: Utensils },
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
              <motion.div layoutId="activeTabRecipe" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-current" style={{ color: typeColor }} />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="px-4 lg:px-[18px] pt-4 lg:pt-[18px]">
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Description Card */}
            <div className="p-4 rounded-[16px] flex gap-3 items-start border mb-[18px]" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.05)" }}>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${typeColor}15` }}>
                <Sparkles className="w-4 h-4" style={{ color: typeColor }} />
              </div>
              <p className="text-[14px] leading-[22px] font-[500] flex-1" style={{ color: isDark ? colors.textMuted : colors.text }}>
                {recipe.description}
              </p>
            </div>

            {/* Nutrition Breakdown */}
            <div className="flex items-center gap-2 mb-2.5 mt-3.5">
              <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
              <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>NUTRITION BREAKDOWN</h3>
            </div>
            <div className="p-4 rounded-[18px] mb-1 shadow-sm border" style={{ backgroundColor: colors.card, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.03)" }}>
              {[
                { name: "Protein", pct: proteinPct, val: `${baseProtein}g`, color: "#2E68B0", icon: Activity },
                { name: "Carbs", pct: carbsPct, val: `${baseCarbs}g`, color: "#36B56A", icon: Leaf },
                { name: "Fat", pct: fatPct, val: `${baseFat}g`, color: "#C44E1C", icon: Droplet },
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

            {/* Recipe Info */}
            <div className="flex items-center gap-2 mb-2.5 mt-3.5">
              <div className="w-[3px] h-3 rounded-full" style={{ backgroundColor: typeColor }} />
              <h3 className="text-[9px] font-[800] tracking-[2px] uppercase" style={{ color: colors.textMuted }}>RECIPE DETAILS</h3>
            </div>
            <div className="flex flex-wrap gap-[10px] mb-1">
              {[
                { label: "SERVINGS", value: recipe.servings ? `${recipe.servings} Servings` : null, icon: Utensils, color: "#8B5CF6", bg: "rgba(139,92,246,0.10)" },
                { label: "PREP TIME", value: recipe.timeMinutes ? `${recipe.timeMinutes} Minutes` : null, icon: Clock, color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
                { label: "DOSHA EFFECT", value: recipe.doshaBalance, icon: ShieldCheck, color: "#10B981", bg: "rgba(16,185,129,0.10)" },
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
          </motion.div>
        )}

        {/* ─── Ingredients Tab ─── */}
        {activeTab === "ingredients" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {recipe?.ingredients && recipe.ingredients.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-[14px]">
                  <h3 className="text-[16px] font-[800]" style={{ color: colors.text }}>{recipe.ingredients.length} Ingredients</h3>
                  <div className="px-3 py-1.5 rounded-[10px]" style={{ backgroundColor: "rgba(54,181,106,0.10)" }}>
                    <span className="text-[#36B56A] text-[11px] font-[700]">✅ Recipe Ready</span>
                  </div>
                </div>
                
                {recipe.ingredients.map((ing, i) => {
                  const hasName = !!ing.name?.trim();
                  const hasQty = !!ing.amount?.trim();
                  const isQtyOnly = !hasName && hasQty;
                  const displayName = isQtyOnly ? ing.amount : ing.name || "Unknown Ingredient";
                  const displayQty = isQtyOnly ? null : ing.amount;

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
                {recipe.instructions && recipe.instructions.length > 0 && (
                  <>
                    <div className="h-[1px] w-full my-5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                    <div className="flex items-center mb-1">
                      <Utensils className="w-[18px] h-[18px] mr-2" style={{ color: typeColor }} />
                      <h3 className="text-[16px] font-[800]" style={{ color: colors.text }}>How to Prepare</h3>
                    </div>
                    <p className="text-[11px] mb-4 ml-6" style={{ color: colors.textMuted }}>
                      {recipe.instructions.length} easy steps to make this dish
                    </p>

                    {recipe.instructions.map((step, i) => {
                      const cleanStep = step.replace(/^Step\s*\d+\s*[:.]\s*/i, "");
                      const isLast = i === recipe.instructions!.length - 1;
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
      </div>
    </div>
  );
}

export default function RecipeDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <RecipeDetailContent />
    </Suspense>
  );
}
