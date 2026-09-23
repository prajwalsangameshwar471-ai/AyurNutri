"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { saveOnboarding, subscribeToOnboarding } from "@/lib/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, MapPin, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

import { Suspense } from "react";

function OnboardingContent() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const retake = searchParams.get("retake");
  const uid = user?.uid || "";

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [diet, setDiet] = useState("");
  const [region, setRegion] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleContinue = async () => {
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
      if (retake === "true") {
        router.back();
      } else {
        router.replace("/dashboard");
      }
    } catch (e) {
      console.error("Failed to save onboarding:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div
        className="px-6 py-6 rounded-b-3xl"
        style={{ backgroundColor: colors.headerBg }}
      >
        <span
          className="text-xs font-black tracking-widest"
          style={{ color: colors.gold }}
        >
          YOUR PREFERENCES
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 pb-32">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">🌿</span>
          <h1 className="text-2xl font-black mb-2" style={{ color: colors.text }}>
            Tell Us About Yourself
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            This helps us create your personalized Ayurvedic meal plan.
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label
              className="text-xs font-black tracking-wider mb-2 block ml-1"
              style={{ color: colors.text }}
            >
              WEIGHT (KG)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 70"
              className="w-full px-4 py-3 rounded-2xl border outline-none transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                color: colors.text,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs font-black tracking-wider mb-2 block ml-1"
              style={{ color: colors.text }}
            >
              HEIGHT (CM)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g., 175"
              className="w-full px-4 py-3 rounded-2xl border outline-none transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                color: colors.text,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label
              className="text-xs font-black tracking-wider mb-2 block ml-1"
              style={{ color: colors.text }}
            >
              AGE
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g., 28"
              className="w-full px-4 py-3 rounded-2xl border outline-none transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                color: colors.text,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs font-black tracking-wider mb-2 block ml-1"
              style={{ color: colors.text }}
            >
              STATE (INDIA)
            </label>
            <button
              onClick={() => setShowStateModal(true)}
              className="w-full px-4 py-3 rounded-2xl border text-left transition-all flex items-center justify-between"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.inputBorder,
                color: region ? colors.text : colors.textMuted,
              }}
            >
              <span>{region || "Select State"}</span>
              <MapPin className="w-4 h-4" style={{ color: colors.textMuted }} />
            </button>
            <p className="text-xs mt-2 italic" style={{ color: colors.textSecondary }}>
              {!region
                ? "Pick your state so we can include your local favorite flavors! 🍛"
                : region === "All India / General"
                ? "Great! You'll get a vibrant variety of Ayurvedic recipes from all across India. ✨"
                : `Perfect! We'll prepare your plan with authentic ${region} specialties. 🌿`}
            </p>
          </div>
        </div>

        {/* Gender */}
        <label
          className="text-xs font-black tracking-wider mb-3 block ml-1"
          style={{ color: colors.text }}
        >
          GENDER
        </label>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {GENDERS.map((g) => {
            const isActive = gender === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGender(g.id)}
                className="p-4 rounded-2xl border-2 transition-all"
                style={{
                  backgroundColor: isActive ? `${g.color}10` : colors.card,
                  borderColor: isActive ? g.color : "transparent",
                }}
              >
                <span className="text-2xl mb-1 block">{g.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: isActive ? g.color : colors.textSecondary }}
                >
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Diet */}
        <label
          className="text-xs font-black tracking-wider mb-3 block ml-1"
          style={{ color: colors.text }}
        >
          DIETARY PREFERENCE
        </label>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {DIETS.map((d) => {
            const isActive = diet === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDiet(d.id)}
                className="p-4 rounded-2xl border-2 transition-all flex items-center gap-3"
                style={{
                  backgroundColor: isActive ? `${d.color}10` : colors.card,
                  borderColor: isActive ? d.color : "transparent",
                }}
              >
                <span className="text-2xl">{d.icon}</span>
                <span
                  className="font-semibold"
                  style={{ color: isActive ? d.color : colors.textSecondary }}
                >
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Goals */}
        <label
          className="text-xs font-black tracking-wider mb-3 block ml-1"
          style={{ color: colors.text }}
        >
          WHAT&apos;S YOUR GOAL?
        </label>
        <div className="space-y-3 mb-8">
          {GOALS.map((g) => {
            const isActive = goal === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className="w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4"
                style={{
                  backgroundColor: isActive ? `${g.color}08` : colors.card,
                  borderColor: isActive ? g.color : "transparent",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${g.color}15` }}
                >
                  <span className="text-2xl">{g.icon}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3
                    className="font-bold"
                    style={{ color: isActive ? g.color : colors.text }}
                  >
                    {g.title}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    {g.desc}
                  </p>
                </div>
                {isActive && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: g.color }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 p-6 border-t"
        style={{ backgroundColor: colors.background, borderColor: colors.divider }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={!canContinue || loading}
            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              backgroundColor: colors.primaryBtn,
              color: colors.primaryBtnText,
            }}
          >
            {loading ? (
              <div
                className="w-6 h-6 rounded-full border-2 border-b-transparent animate-spin"
                style={{ borderColor: colors.primaryBtnText }}
              />
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* State Modal */}
      <AnimatePresence>
        {showStateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStateModal(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[70vh] overflow-hidden"
              style={{ backgroundColor: colors.card }}
            >
              <div className="p-6 border-b" style={{ borderColor: colors.divider }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                      Select Your State
                    </h2>
                    <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                      Help us personalize your Ayurvedic recipes to your local culture! ✨
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStateModal(false)}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <X className="w-5 h-5" style={{ color: colors.textMuted }} />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[50vh] p-4">
                {INDIAN_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setRegion(state);
                      setShowStateModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl mb-1 transition-all"
                    style={{
                      backgroundColor: region === state ? `${colors.gold}15` : "transparent",
                    }}
                  >
                    <span
                      className="font-medium"
                      style={{
                        color: region === state ? colors.gold : colors.text,
                      }}
                    >
                      {state}
                    </span>
                    {region === state && (
                      <Check className="w-5 h-5" style={{ color: colors.gold }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
