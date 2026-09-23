"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PRESET_GOALS = [
  { id: "weight", icon: "⚖️", title: "Weight Management" },
  { id: "energy", icon: "⚡", title: "Boost Energy Levels" },
  { id: "dosha", icon: "🧘", title: "Balance Doshas" },
  { id: "sleep", icon: "😴", title: "Improve Sleep Quality" },
  { id: "immunity", icon: "🛡️", title: "Strengthen Immunity" },
  { id: "digestion", icon: "🥑", title: "Better Digestion (Agni)" },
];

export default function HealthGoalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore.subscribeToGoals(user.uid, (data) => {
      if (data?.selectedGoals) {
        setSelectedGoals(data.selectedGoals);
      } else {
        setSelectedGoals([]);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== id));
    } else {
      if (selectedGoals.length < 3) {
        setSelectedGoals([...selectedGoals, id]);
      }
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await firestore.saveGoals(user.uid, selectedGoals);
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      console.error("Failed to save goals:", e);
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
          Health Goals
        </h1>
      </div>

      <div className="px-5 pt-8 max-w-xl mx-auto">
        <p className="text-[14px] leading-[22px] text-center mb-8 px-2" style={{ color: colors.textSecondary }}>
          Select up to 3 primary health goals. AyurNutri will tailor your diet plans to help you achieve them.
        </p>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border mb-6 text-center"
            style={{ backgroundColor: colors.successBg, borderColor: colors.successBorder }}
          >
            <span className="text-[13px] font-[600]" style={{ color: colors.successText }}>
              Goals saved successfully!
            </span>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {PRESET_GOALS.map((g) => {
            const isSelected = selectedGoals.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className="relative flex flex-col items-center justify-center p-5 rounded-[20px] border-2 transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: isSelected ? (isDark ? "rgba(16,185,129,0.15)" : "#E6F4EA") : colors.card,
                  borderColor: isSelected ? colors.green : "transparent",
                  boxShadow: isDark ? "none" : `0 2px 10px rgba(0,0,0,0.04)`,
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors"
                  style={{ 
                    backgroundColor: isSelected ? colors.card : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") 
                  }}
                >
                  <span className="text-[24px]">{g.icon}</span>
                </div>
                <h3 
                  className="text-[13px] font-[700] text-center leading-[18px]"
                  style={{ color: isSelected ? colors.text : colors.textSecondary }}
                >
                  {g.title}
                </h3>
                
                {isSelected && (
                  <div 
                    className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: colors.green }}
                  >
                    <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || selectedGoals.length === 0}
          className="w-full h-14 rounded-[16px] flex items-center justify-center shadow-sm transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: colors.primaryBtn }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.gold }} />
          ) : (
            <span className="text-[16px] font-[800] tracking-wide" style={{ color: colors.primaryBtnText }}>
              Save Goals
            </span>
          )}
        </button>

        <p className="text-center mt-4 text-[13px] font-[700]" style={{ color: colors.textMuted }}>
          {selectedGoals.length} / 3 Selected
        </p>
      </div>
    </div>
  );
}
