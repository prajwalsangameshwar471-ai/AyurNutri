"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { saveOnboarding, subscribeToOnboarding } from "@/lib/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Check, MapPin, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const GENDERS = [
  { id: "male", icon: "♂️", label: "Male", color: "#3B82F6" },
  { id: "female", icon: "♀️", label: "Female", color: "#EC4899" },
  { id: "other", icon: "⚧️", label: "Other", color: "#8B5CF6" },
];

const INDIAN_STATES = [
  "All India / General",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli", "Daman & Diu", "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const GOALS = [
  { id: "lose", icon: "🔥", title: "Lose Weight", desc: "Trim down and feel lighter", color: "#EF4444" },
  { id: "gain", icon: "💪", title: "Gain Weight", desc: "Build mass healthily", color: "#3B82F6" },
  { id: "muscle", icon: "🏋️", title: "Build Muscle", desc: "Increase strength and definition", color: "#10B981" },
  { id: "balance", icon: "🧘", title: "Balance Doshas", desc: "Achieve Ayurvedic harmony", color: "#D4A24E" },
  { id: "energy", icon: "⚡", title: "Boost Energy", desc: "Feel vibrant all day long", color: "#F59E0B" },
];

const DIETS = [
  { id: "vegetarian", icon: "🥗", label: "Vegetarian", color: "#10B981" },
  { id: "vegan", icon: "🌱", label: "Vegan", color: "#84CC16" },
  { id: "non-veg", icon: "🍗", label: "Non-Veg", color: "#EF4444" },
  { id: "mixed", icon: "🍱", label: "Mixed / Both", color: "#F59E0B" },
];

export default function HealthProfilePage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const uid = user?.uid || "";

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [diet, setDiet] = useState("");
  const [region, setRegion] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToOnboarding(uid, (d) => {
      if (d) {
        setWeight(d.weight?.toString() || "");
        setHeight(d.height?.toString() || "");
        setAge(d.age?.toString() || "");
        setGender(d.gender || "");
        setDiet(d.diet || "");
        setRegion(d.region || "");
        setGoal(d.goal || "");
      }
    });
    return () => unsub();
  }, [uid]);

  const canContinue = weight && height && age && gender && diet && region && goal;

  const handleSave = async () => {
    if (!canContinue || !uid) return;
    setLoading(true);
    try {
      await saveOnboarding(uid, {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age, 10),
        gender,
        diet,
        region,
        goal,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      console.error("Failed to save health profile:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-6" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div 
        className="px-6 pt-10 pb-6 rounded-b-[32px] shadow-sm z-10 relative flex items-center"
        style={{ backgroundColor: isDark ? colors.card : colors.headerBg }}
      >
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 border"
          style={{ 
            backgroundColor: colors.card, 
            borderColor: isDark ? colors.cardBorder : "transparent",
            boxShadow: isDark ? "none" : `0 2px 8px rgba(0,0,0,0.05)`
          }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
        </button>
        <h1 className="text-[18px] font-[800] text-center flex-1 pr-11" style={{ color: colors.textOnHeader || colors.text }}>
          Health Profile
        </h1>
      </div>

      <div className="px-5 pt-8 max-w-xl mx-auto space-y-8">
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border text-center"
            style={{ backgroundColor: colors.successBg, borderColor: colors.successBorder }}
          >
            <span className="text-[13px] font-[600]" style={{ color: colors.successText }}>
              Health profile saved successfully!
            </span>
          </motion.div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-[800] tracking-wider mb-2 block ml-1" style={{ color: colors.text }}>
              WEIGHT (KG)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 70"
              className="w-full px-4 py-3.5 rounded-[16px] border outline-none font-[600]"
              style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent", color: colors.text, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.03)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-[800] tracking-wider mb-2 block ml-1" style={{ color: colors.text }}>
              HEIGHT (CM)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g., 175"
              className="w-full px-4 py-3.5 rounded-[16px] border outline-none font-[600]"
              style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent", color: colors.text, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.03)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-[800] tracking-wider mb-2 block ml-1" style={{ color: colors.text }}>
              AGE
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g., 28"
              className="w-full px-4 py-3.5 rounded-[16px] border outline-none font-[600]"
              style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent", color: colors.text, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.03)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-[800] tracking-wider mb-2 block ml-1" style={{ color: colors.text }}>
              STATE (INDIA)
            </label>
            <button
              onClick={() => setShowStateModal(true)}
              className="w-full px-4 py-3.5 rounded-[16px] border text-left flex items-center justify-between font-[600]"
              style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent", color: region ? colors.text : colors.textMuted, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.03)' }}
            >
              <span className="truncate pr-2">{region || "Select State"}</span>
              <MapPin className="w-4 h-4 shrink-0" style={{ color: colors.textMuted }} />
            </button>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="text-[11px] font-[800] tracking-wider mb-3 block ml-1" style={{ color: colors.text }}>
            GENDER
          </label>
          <div className="grid grid-cols-3 gap-3">
            {GENDERS.map((g) => {
              const isActive = gender === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  className="p-4 rounded-[16px] border-2 transition-all flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: isActive ? `${g.color}15` : colors.card,
                    borderColor: isActive ? g.color : "transparent",
                    boxShadow: (isDark || isActive) ? 'none' : '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <span className="text-2xl mb-1">{g.icon}</span>
                  <span className="text-[13px] font-[700]" style={{ color: isActive ? g.color : colors.textSecondary }}>
                    {g.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diet */}
        <div>
          <label className="text-[11px] font-[800] tracking-wider mb-3 block ml-1" style={{ color: colors.text }}>
            DIETARY PREFERENCE
          </label>
          <div className="grid grid-cols-2 gap-3">
            {DIETS.map((d) => {
              const isActive = diet === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDiet(d.id)}
                  className="p-4 rounded-[16px] border-2 transition-all flex items-center gap-3"
                  style={{
                    backgroundColor: isActive ? `${d.color}15` : colors.card,
                    borderColor: isActive ? d.color : "transparent",
                    boxShadow: (isDark || isActive) ? 'none' : '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <span className="text-[22px]">{d.icon}</span>
                  <span className="text-[14px] font-[700]" style={{ color: isActive ? d.color : colors.textSecondary }}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div>
          <label className="text-[11px] font-[800] tracking-wider mb-3 block ml-1" style={{ color: colors.text }}>
            WHAT'S YOUR MAIN GOAL?
          </label>
          <div className="space-y-3">
            {GOALS.map((g) => {
              const isActive = goal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className="w-full p-4 rounded-[16px] border-2 transition-all flex items-center gap-4 text-left"
                  style={{
                    backgroundColor: isActive ? `${g.color}10` : colors.card,
                    borderColor: isActive ? g.color : "transparent",
                    boxShadow: (isDark || isActive) ? 'none' : '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${g.color}15` }}>
                    <span className="text-[24px]">{g.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-[800] mb-0.5" style={{ color: isActive ? g.color : colors.text }}>
                      {g.title}
                    </h3>
                    <p className="text-[13px]" style={{ color: colors.textMuted }}>
                      {g.desc}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: g.color }}>
                      <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canContinue || loading}
          className="w-full h-14 rounded-[16px] flex items-center justify-center shadow-sm transition-opacity hover:opacity-80 disabled:opacity-50 mt-8"
          style={{ backgroundColor: colors.primaryBtn }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.gold }} />
          ) : (
            <span className="text-[16px] font-[800] tracking-wide" style={{ color: colors.primaryBtnText }}>
              Save Profile
            </span>
          )}
        </button>

      </div>

      {/* State Modal */}
      <AnimatePresence>
        {showStateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 max-h-[85vh] flex flex-col"
              style={{ backgroundColor: colors.card }}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-[18px] font-[800]" style={{ color: colors.text }}>Select State</h3>
                  <p className="text-[13px] mt-1" style={{ color: colors.textMuted }}>For localized Ayurvedic recipes</p>
                </div>
                <button 
                  onClick={() => setShowStateModal(false)}
                  className="p-1 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-6 h-6" style={{ color: colors.text }} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 rounded-xl pr-2" style={{ scrollbarWidth: "none" }}>
                {INDIAN_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setRegion(state);
                      setShowStateModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-[14px] mb-2 transition-all"
                    style={{ backgroundColor: region === state ? `${colors.gold}15` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') }}
                  >
                    <span className="font-[600] text-[15px]" style={{ color: region === state ? colors.gold : colors.text }}>
                      {state}
                    </span>
                    {region === state && (
                      <Check className="w-5 h-5" style={{ color: colors.gold }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
