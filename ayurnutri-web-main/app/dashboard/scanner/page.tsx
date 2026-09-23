"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { subscribeToDoshaResult, subscribeToOnboarding } from "@/lib/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Activity, AlertCircle, Camera, Flame, Leaf, RefreshCw, 
  Scan, Sparkles, Image as ImageIcon, X, Info, ChevronRight, 
  Utensils, Target, TriangleAlert
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DOSHA_COLORS: Record<string, string> = {
  Vata: "#5B8FB9",
  Pitta: "#E07A5F",
  Kapha: "#6A994E",
  "Vata-Pitta": "#9B5DE5",
  "Pitta-Kapha": "#D4A24E",
  "Vata-Kapha": "#40916C",
  Tridosha: "#1B4332",
};

const DOSHA_EMOJIS: Record<string, string> = {
  Vata: "🌬️",
  Pitta: "🔥",
  Kapha: "🌿",
  "Vata-Pitta": "🌬️🔥",
  "Pitta-Kapha": "🔥🌿",
  "Vata-Kapha": "🌬️🌿",
  Tridosha: "☯️",
};

interface ScanResult {
  name: string;
  calories: number;
  servingSize: string;
  compatibility: "Good" | "Neutral" | "Avoid";
  recommendation: string;
  dietaryWarning?: string;
  doshaImpact: {
    vata: string;
    pitta: string;
    kapha: string;
  };
  ayurvedicProperties: {
    rasa: string;
    guna: string;
    virya: string;
    vipaka: string;
  };
}

export default function ScannerPage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const uid = user?.uid || "";

  const [doshaData, setDoshaData] = useState<{ doshaType?: string } | null>(null);
  const [onboardingData, setOnboardingData] = useState<{ diet?: string; goal?: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDosha = !!doshaData?.doshaType;
  const hasOnboarding = !!onboardingData?.diet || !!onboardingData?.goal;
  const activeDosha = hasDosha && doshaData?.doshaType ? doshaData.doshaType : "";
  const doshaColor = activeDosha && DOSHA_COLORS[activeDosha] ? DOSHA_COLORS[activeDosha] : colors.gold;
  const doshaEmoji = activeDosha && DOSHA_EMOJIS[activeDosha] ? DOSHA_EMOJIS[activeDosha] : "👤";

  useEffect(() => {
    if (!uid) return;
    const unsubDosha = subscribeToDoshaResult(uid, (d) => setDoshaData(d || null));
    const unsubOnboarding = subscribeToOnboarding(uid, (d) => setOnboardingData(d || null));
    return () => {
      unsubDosha();
      unsubOnboarding();
    };
  }, [uid]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setTextInput("");
        setResult(null);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setImagePreview(null);
    setTextInput("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!imagePreview && !textInput.trim()) {
      setError("Please upload an image or type a food name.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    // Simulate AI analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResult: ScanResult = {
      name: textInput.trim() || "Vegetable Biryani",
      calories: 320,
      servingSize: "1 cup (200g)",
      compatibility: hasDosha ? "Good" : "Neutral",
      recommendation: hasDosha
        ? `This dish aligns well with your ${doshaData?.doshaType} constitution. The warming spices support digestion, while the vegetables provide essential nutrients.`
        : "This is a nutritious choice with balanced macronutrients. The spices offer digestive benefits according to Ayurvedic principles.",
      doshaImpact: {
        vata: "Balances",
        pitta: "Neutral",
        kapha: "Slightly Increases",
      },
      ayurvedicProperties: {
        rasa: "Sweet, Pungent",
        guna: "Light, Dry",
        virya: "Warming",
        vipaka: "Sweet",
      },
    };

    setResult(mockResult);
    setLoading(false);
  };

  const getCompatibilityColor = (comp: string) => {
    if (comp === "Good") return "#10B981";
    if (comp === "Neutral") return "#F59E0B";
    if (comp === "Avoid") return "#EF4444";
    return colors.gold;
  };

  const getDoshaImpactColor = (impact: string) => {
    if (impact.includes("Increases")) return "#EF4444";
    if (impact.includes("Balances") || impact.includes("Decreases")) return "#10B981";
    return "#6B7280";
  };

  const renderActiveProfileBanner = () => {
    if (!hasDosha && !hasOnboarding) {
      return (
        <div
          onClick={() => router.push("/dashboard/dosha")}
          className="flex items-center p-[14px] rounded-3xl mb-5 shadow-sm cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.surface }}
        >
          <Info className="w-5 h-5" style={{ color: colors.gold }} />
          <p className="flex-1 text-[13px] ml-2.5 mr-2 leading-[18px]" style={{ color: colors.textSecondary }}>
            Tap to complete your profile for highly personalized results.
          </p>
          <ChevronRight className="w-4 h-4" style={{ color: colors.gold }} />
        </div>
      );
    }

    return (
      <div 
        className="flex flex-row items-center p-[14px] rounded-3xl mb-5 shadow-sm border"
        style={{ 
          backgroundColor: colors.card, 
          borderColor: isDark ? colors.cardBorder : `${doshaColor}15`, 
          borderWidth: 1.5 
        }}
      >
        <div className="flex-1 justify-center">
          <div className="flex items-center mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: '#34D399' }} />
            <span className="text-[10px] font-[800] tracking-[1.5px] opacity-80" style={{ color: colors.textSecondary }}>
              ACTIVE PROFILE
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center px-2.5 py-1 rounded-xl gap-1" style={{ backgroundColor: isDark ? `${doshaColor}20` : `${doshaColor}10` }}>
              <span className="text-xs">{doshaEmoji}</span>
              <span className="text-[13px] font-[700]" style={{ color: isDark ? '#FFF' : doshaColor }}>
                {activeDosha || "Discovery"}
              </span>
            </div>
            <div className="flex items-center px-2.5 py-1 rounded-xl gap-1" style={{ backgroundColor: colors.surface }}>
              <Utensils className="w-3 h-3" style={{ color: colors.textSecondary }} />
              <span className="text-[13px] font-[700]" style={{ color: colors.text }}>
                {hasOnboarding ? onboardingData.diet || "Any" : "Setup"}
              </span>
            </div>
            <div className="flex items-center px-2.5 py-1 rounded-xl gap-1" style={{ backgroundColor: colors.surface }}>
              <Target className="w-3 h-3" style={{ color: colors.textSecondary }} />
              <span className="text-[13px] font-[700]" style={{ color: colors.text }}>
                {hasOnboarding ? onboardingData.goal || "Goal" : "Goal"}
              </span>
            </div>
          </div>
        </div>
        {(!hasDosha || !hasOnboarding) && (
          <button 
            className="px-3.5 py-2 rounded-xl ml-2 transition-opacity hover:opacity-80" 
            style={{ backgroundColor: doshaColor }} 
            onClick={() => router.push(hasDosha ? "/dashboard/preferences" : "/dashboard/dosha")}
          >
            <span className="text-[12px] font-[800] text-white uppercase">Complete</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-6" style={{ backgroundColor: colors.background }}>
      {/* Header matching RN padding */}
      <div 
        className="px-6 py-4 rounded-b-[24px] lg:rounded-b-[32px] flex items-center justify-between shadow-sm z-10 relative" 
        style={{ backgroundColor: isDark ? colors.card : colors.headerBg }}
      >
        <div className="flex-1">
          <h1 className="text-[26px] font-[900] tracking-[-0.5px] leading-tight" style={{ color: colors.textOnHeader }}>
            Food Scanner
          </h1>
          <p className="text-[14px] font-[500] mt-1" style={{ color: colors.textOnHeaderSub }}>
            AI-powered Dosha compatibility
          </p>
        </div>
        {result && (
          <button
            onClick={handleClear}
            disabled={loading}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors.headerOverlay }}
          >
            <RefreshCw className="w-5 h-5" style={{ color: colors.textOnHeader }} />
          </button>
        )}
      </div>

      <div className="w-full min-w-0 max-w-4xl mx-auto px-2 lg:px-8 pt-4 pb-6">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderActiveProfileBanner()}

              <div 
                className="p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border mb-5 shadow-sm" 
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, boxShadow: `0 8px 16px rgba(0,0,0,0.05)` }}
              >
                {!imagePreview ? (
                  <>
                    <div 
                      onClick={handleCameraClick}
                      className="flex flex-col items-center justify-center p-6 lg:p-8 rounded-[20px] lg:rounded-3xl border-2 border-dashed mb-5 cursor-pointer transition-opacity hover:opacity-80"
                      style={{ borderColor: colors.divider, backgroundColor: colors.background }}
                    >
                      <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors.surface }}>
                        <Scan className="w-9 h-9" style={{ color: colors.gold }} />
                      </div>
                      <h3 className="text-[18px] font-[800] mb-1.5" style={{ color: colors.text }}>
                        Tap to Scan Food
                      </h3>
                      <p className="text-[13px] text-center mb-5" style={{ color: colors.textSecondary }}>
                        Identify ingredients & dosha compatibility
                      </p>
                      
                      <div className="flex w-full gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCameraClick(); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-opacity hover:opacity-80" 
                          style={{ backgroundColor: colors.card }}
                        >
                          <Camera className="w-5 h-5" style={{ color: colors.gold }} />
                          <span className="text-[15px] font-[600]" style={{ color: colors.text }}>Camera</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCameraClick(); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-opacity hover:opacity-80" 
                          style={{ backgroundColor: colors.card }}
                        >
                          <ImageIcon className="w-5 h-5" style={{ color: colors.gold }} />
                          <span className="text-[15px] font-[600]" style={{ color: colors.text }}>Gallery</span>
                        </button>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Divider row matching RN style */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex-1 h-px" style={{ backgroundColor: colors.divider }} />
                      <span className="text-[12px] font-[700] tracking-wider" style={{ color: colors.textMuted }}>
                        OR TYPE
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: colors.divider }} />
                    </div>

                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => {
                        setTextInput(e.target.value);
                        setError("");
                      }}
                      placeholder="E.g., Masala Dosa, Quinoa Salad..."
                      className="w-full px-[18px] py-[15px] rounded-[18px] border outline-none transition-all mb-4 text-[16px]"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    />
                  </>
                ) : (
                  <div className="mb-5 rounded-[20px] lg:rounded-[24px] overflow-hidden border relative" style={{ borderColor: colors.cardBorder }}>
                    <img
                      src={imagePreview}
                      alt="Food preview"
                      className="w-full h-56 object-cover"
                    />
                    <button
                      onClick={handleClear}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="p-4 bg-white dark:bg-zinc-900" style={{ backgroundColor: colors.card }}>
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Add details (e.g. 'It's very spicy')"
                        className="w-full px-[18px] py-[15px] rounded-[18px] border outline-none transition-all text-[16px]"
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={loading || (!imagePreview && !textInput.trim())}
                  className="w-full py-4 rounded-[18px] font-[800] text-[16px] transition-all disabled:opacity-70 flex items-center justify-center mt-2"
                  style={{ backgroundColor: colors.primaryBtn, color: colors.primaryBtnText }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-[18px] h-[18px] animate-spin" style={{ color: colors.gold }} />
                      Analyzing...
                    </span>
                  ) : (
                    "Analyze Food"
                  )}
                </button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-4 p-3.5 rounded-xl border"
                    style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBorder }}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: colors.errorText }} />
                    <p className="text-[14px] font-[500]" style={{ color: colors.errorText }}>
                      {error}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Features Grid identical to RN */}
              <div className="p-4 lg:p-6 rounded-[24px] lg:rounded-[28px]" style={{ backgroundColor: colors.card }}>
                <h4 className="text-[16px] font-[800] mb-4" style={{ color: colors.text }}>
                  AI Analysis Includes:
                </h4>
                <div className="grid grid-cols-2 gap-[14px]">
                  {[
                    { icon: Scan, label: "Recognition" },
                    { icon: Leaf, label: "Dosha Rating" },
                    { icon: Flame, label: "Properties" },
                    { icon: Activity, label: "Nutrition" },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-[14px] py-[12px] rounded-2xl"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <f.icon className="w-[18px] h-[18px]" style={{ color: colors.gold }} />
                      <span className="text-[13px] font-[600]" style={{ color: colors.textSecondary }}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-[24px] lg:rounded-[32px] overflow-hidden border shadow-sm pb-6"
              style={{ 
                backgroundColor: colors.card, 
                borderColor: isDark ? colors.cardBorder : "transparent",
                boxShadow: isDark ? "none" : `0 8px 24px rgba(0,0,0,0.06)`
              }}
            >
              {/* Result Header */}
              {imagePreview ? (
                <div className="relative h-64 mb-5">
                  <img src={imagePreview} alt={result.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-6 py-5 flex items-end justify-between">
                    <div className="flex-1 mr-4">
                      <h2 className="text-[26px] font-[900] tracking-[-0.5px] leading-tight text-white mb-1 drop-shadow-md">
                        {result.name}
                      </h2>
                      <p className="text-[14px] font-[500] text-white/90">
                        ~{result.calories} kcal / {result.servingSize}
                      </p>
                    </div>
                    <div 
                      className="px-3.5 py-[6px] rounded-full" 
                      style={{ backgroundColor: getCompatibilityColor(result.compatibility) }}
                    >
                      <span className="text-[13px] font-[800] tracking-wide text-white">
                        {result.compatibility}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 pt-6 pb-2 flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <h2 className="text-[26px] font-[900] tracking-[-0.5px] leading-tight mb-1" style={{ color: colors.text }}>
                      {result.name}
                    </h2>
                    <p className="text-[14px] font-[500]" style={{ color: colors.textSecondary }}>
                      ~{result.calories} kcal / {result.servingSize}
                    </p>
                  </div>
                  <div 
                    className="px-3.5 py-[6px] rounded-full border-[1.5px]" 
                    style={{ 
                      backgroundColor: `${getCompatibilityColor(result.compatibility)}15`,
                      borderColor: getCompatibilityColor(result.compatibility)
                    }}
                  >
                    <span className="text-[13px] font-[800] tracking-wide" style={{ color: getCompatibilityColor(result.compatibility) }}>
                      {result.compatibility}
                    </span>
                  </div>
                </div>
              )}

              <div className="px-6 space-y-6 mt-2">
                {/* Recommendation */}
                <div className="p-[18px] rounded-2xl" style={{ backgroundColor: colors.surface }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5" style={{ color: colors.gold }} />
                    <span className="text-[15px] font-[800]" style={{ color: colors.text }}>
                      AI Recommendation
                    </span>
                  </div>
                  <p className="text-[15px] leading-[24px]" style={{ color: colors.text }}>
                    {result.recommendation}
                  </p>
                </div>

                {/* Dietary Warning */}
                {result.dietaryWarning && (
                  <div className="p-4 rounded-2xl flex items-center border" style={{ backgroundColor: "#EF444415", borderColor: "#EF444430" }}>
                    <TriangleAlert className="w-5 h-5 mr-3 shrink-0" style={{ color: "#EF4444" }} />
                    <p className="text-[14px] leading-[20px] font-[500]" style={{ color: "#EF4444" }}>
                      {result.dietaryWarning}
                    </p>
                  </div>
                )}

                {/* Dosha Impact Section */}
                <div>
                  <h3 className="text-[18px] font-[800] mb-3" style={{ color: colors.text }}>Dosha Impact</h3>
                  <div className="flex gap-2.5">
                    {[
                      { name: "Vata", val: result.doshaImpact.vata },
                      { name: "Pitta", val: result.doshaImpact.pitta },
                      { name: "Kapha", val: result.doshaImpact.kapha },
                    ].map((d, i) => (
                      <div key={i} className="flex-1 p-3.5 rounded-2xl items-center text-center" style={{ backgroundColor: colors.surface }}>
                        <p className="text-[12px] font-[600] tracking-wide mb-[10px]" style={{ color: colors.textSecondary }}>
                          {d.name}
                        </p>
                        <div className="flex items-center justify-center px-2 py-1.5 rounded-[10px] gap-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: getDoshaImpactColor(d.val) }} />
                          <span className="text-[13px] font-[800]" style={{ color: colors.text }}>
                            {d.val}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ayurvedic Profile Section */}
                <div>
                  <h3 className="text-[18px] font-[800] mb-3" style={{ color: colors.text }}>Ayurvedic Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Rasa", val: result.ayurvedicProperties.rasa },
                      { label: "Guna", val: result.ayurvedicProperties.guna },
                      { label: "Virya", val: result.ayurvedicProperties.virya },
                      { label: "Vipaka", val: result.ayurvedicProperties.vipaka },
                    ].map((p, i) => (
                      <div key={i} className="p-4 rounded-[20px] flex flex-col justify-center" style={{ backgroundColor: colors.surface }}>
                        <p className="text-[11px] font-[800] tracking-widest uppercase mb-1" style={{ color: colors.textMuted }}>
                          {p.label}
                        </p>
                        <p className="text-[15px] font-[700]" style={{ color: colors.text }}>
                          {p.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scan Another Button */}
                <button
                  onClick={handleClear}
                  className="w-full py-4 rounded-[18px] font-[800] text-[16px] flex items-center justify-center gap-2 mt-4 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: colors.primaryBtn, color: colors.primaryBtnText }}
                >
                  <Scan className="w-5 h-5" />
                  Scan Another Item
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
