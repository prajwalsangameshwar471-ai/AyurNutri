"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { getInitials, getTodayIndex, getWeekStartDate } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, LogOut, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const GOAL_LABELS: Record<string, string> = {
  weight: "Weight Management",
  energy: "Boost Energy",
  dosha: "Balance Doshas",
  sleep: "Better Sleep",
  immunity: "Immunity",
  digestion: "Better Digestion",
};

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

export default function ProfilePage() {
  const { user, signOutUser, resetPassword } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [goals, setGoals] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<any>(null);
  const [doshaType, setDoshaType] = useState<string | null>(null);
  const [dietitianName, setDietitianName] = useState<string | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = user?.displayName || "Guest";
  const email = user?.email || "Not available";
  const initials = getInitials(displayName);
  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  useEffect(() => {
    if (!user?.uid) return;

    const unsubProfile = firestore.subscribeToProfile(user.uid, (data) => {
      if (data?.photoURL) setProfilePhoto(data.photoURL);
    });

    const unsubGoals = firestore.subscribeToGoals(user.uid, (data) => {
      setGoals(data?.selectedGoals || []);
    });

    const unsubPrefs = firestore.subscribeToPreferences(user.uid, (data) => {
      setPrefs(data);
    });

    const unsubDosha = firestore.subscribeToDoshaResult(user.uid, (data) => {
      setDoshaType(data?.doshaType || null);
    });

    const unsubOnboarding = firestore.subscribeToOnboarding(user.uid, (data) => {
      setHasActivePlan(!!data?.completed);
    });

    const unsubDietitian = firestore.subscribeToDietitianConnection(user.uid, async (data) => {
      if (data?.dietitianId) {
        const dietitians = await firestore.getAvailableDietitians();
        const found = dietitians.find((d) => d.id === data.dietitianId);
        if (found) setDietitianName(found.name);
      }
    });

    const unsubFavorites = firestore.subscribeToFavorites(user.uid, (favs) => {
      setFavorites(favs || []);
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = firestore.subscribeToMealPlanWeek(user.uid, weekStart, (data: any) => {
      if (data?.weekPlan?.days) {
        const todayIdx = getTodayIndex();
        const meals = data.weekPlan.days[todayIdx]?.meals || [];
        setTodayMeals(meals);
      } else {
        setTodayMeals([]);
      }
    });

    const unsubChecked = firestore.subscribeToCheckedMeals(user.uid, weekStart, (data) => {
      setCheckedMeals(data || {});
    });

    return () => {
      unsubGoals();
      unsubPrefs();
      unsubDosha();
      unsubOnboarding();
      unsubDietitian();
      unsubFavorites();
      unsubMealPlan();
      unsubChecked();
      unsubProfile();
    };
  }, [user?.uid]);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      await resetPassword(user.email);
      setResetMessage("Password reset email sent!");
    } catch {
      setResetMessage("Failed to send reset email.");
    } finally {
      setResetLoading(false);
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await firestore.upsertProfile(user.uid, {
          fullName: displayName,
          email: user.email || "",
          photoURL: base64
        });
        setProfilePhoto(base64);
        alert("Success: Profile photo updated!");
      } catch (error) {
        alert("Upload Failed: Could not save your profile photo.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setShowPhotoOptions(false);
    setIsUploading(true);
    try {
      await firestore.upsertProfile(user.uid, {
        fullName: displayName,
        email: user.email || "",
        photoURL: ""
      });
      setProfilePhoto(null);
      alert("Success: Profile photo removed.");
    } catch (e) {
      alert("Error: Could not remove profile photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const goalsDisplay = goals.length > 0 
    ? goals.map((g) => GOAL_LABELS[g] || g).join(", ")
    : "Not set";

  const notifDisplay = prefs?.notifications ? "Enabled" : "Disabled";
  const themeDisplay = isDark ? "Dark" : "Light";

  const Row = ({ icon, label, value, arrow, last, onClick, href }: any) => {
    const content = (
      <div 
        className={`flex items-center gap-3 py-3.5 px-4 transition-all hover:bg-black/5 dark:hover:bg-white/5 ${!last ? 'border-b' : ''}`}
        style={{ borderColor: colors.divider }}
      >
        <div 
          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
        >
          <span className="text-[18px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-[600] mb-0.5 truncate" style={{ color: colors.textMuted }}>{label}</p>
          <p className="text-[15px] font-[800] truncate" style={{ color: colors.text }}>{value}</p>
        </div>
        {arrow && (
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: colors.gold }} />
          </div>
        )}
      </div>
    );

    if (href) {
      return <Link href={href} className="block w-full">{content}</Link>;
    }
    return (
      <button onClick={onClick} className="block w-full text-left outline-none" disabled={!onClick}>
        {content}
      </button>
    );
  };

  return (
    <div className="w-full min-w-0 min-h-[100dvh] lg:min-h-screen pb-6 overflow-x-hidden" style={{ backgroundColor: colors.background }}>
      {/* Modern Redesigned Header (matching RN) */}
      <div 
        className="px-6 pt-10 pb-6 rounded-b-[32px] shadow-sm z-10 relative transition-colors"
        style={{ backgroundColor: isDark ? colors.card : colors.headerBg }}
      >
        <div className="flex items-center">
          <div 
            className="relative mr-4 shrink-0 cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => !isUploading && setShowPhotoOptions(true)}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            
            {profilePhoto || user?.photoURL ? (
              <img 
                src={profilePhoto || user?.photoURL || ""} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover border-[3px]"
                style={{ borderColor: colors.gold }}
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center border-[3px]"
                style={{ 
                  backgroundColor: `${colors.gold}25`,
                  borderColor: colors.gold,
                }}
              >
                <span className="text-[28px] font-black" style={{ color: colors.textOnHeader }}>{initials}</span>
              </div>
            )}
            
            {/* Photo Overlay (Camera Icon) */}
            <div 
              className="absolute bottom-0 left-0 w-7 h-7 rounded-full flex items-center justify-center border-2"
              style={{ backgroundColor: colors.gold, borderColor: isDark ? colors.card : colors.headerBg }}
            >
              {isUploading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-[14px] h-[14px] text-white" />
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <p className="text-[12px] font-[800] uppercase tracking-wider mb-1" style={{ color: isDark ? colors.textSecondary : colors.textOnHeaderSub }}>
              Ayurvedic Profile
            </p>
            <h1 className="text-[24px] font-[900] tracking-[-0.5px] leading-tight mb-2" style={{ color: colors.textOnHeader }}>
              {displayName}
            </h1>
            <div 
              className="inline-flex items-center px-3 py-1.5 rounded-full border"
              style={{ 
                backgroundColor: isDark ? colors.surface : colors.headerOverlay,
                borderColor: isDark ? colors.cardBorder : colors.headerBorder,
              }}
            >
              <span suppressHydrationWarning className="text-[11px] font-[800] tracking-wide" style={{ color: isDark ? colors.textSecondary : colors.textOnHeaderSub }}>
                🌿 Member since {createdAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 pb-20 space-y-6">
        
        {/* Ayurvedic Insights */}
        <div>
          <h2 className="text-[13px] font-[800] uppercase tracking-[1.5px] mb-3 px-1" style={{ color: colors.text }}>
            Ayurvedic Insights
          </h2>
          <Link
            href={doshaType ? "/dashboard/dosha?retake=true" : "/dashboard/dosha"}
            className="block rounded-3xl p-[22px] border transition-transform hover:scale-[1.01]"
            style={{ 
              backgroundColor: doshaType ? DOSHA_COLORS[doshaType] || colors.green : colors.card,
              borderColor: colors.cardBorder,
              borderWidth: isDark ? 1 : 0,
              boxShadow: isDark ? 'none' : `0 8px 16px rgba(0,0,0,0.05)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div 
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: doshaType ? "rgba(255,255,255,0.25)" : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }}
                >
                  <span className={`leading-none whitespace-nowrap flex items-center justify-center text-[28px] ${doshaType?.includes("-") ? 'text-[22px] tracking-[-2px]' : ''}`}>
                    {doshaType ? DOSHA_EMOJIS[doshaType] || "🧘" : "🔍"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-[800] uppercase tracking-wider mb-1" style={{ color: doshaType ? "rgba(255,255,255,0.7)" : colors.textMuted }}>
                    Current Constitution {doshaType ? "• Tap to retake" : "• Tap to start"}
                  </p>
                  <h3 className="text-[24px] font-[900]" style={{ color: doshaType ? '#FFF' : colors.text }}>
                    {doshaType || "Unknown Dosha"}
                  </h3>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 shrink-0" style={{ color: doshaType ? "#FFF" : colors.textMuted, opacity: doshaType ? 0.6 : 1 }} />
            </div>
            
            {!doshaType ? (
              <div className="mt-5">
                <p className="text-[14px] font-[500] leading-relaxed mb-4" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMuted }}>
                  Discover your unique Ayurvedic constitution to get personalized recommendations.
                </p>
                <div 
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-[12px]"
                  style={{ backgroundColor: isDark ? '#FFF' : colors.text }}
                >
                  <span className="text-[13px] font-[800] text-center" style={{ color: isDark ? colors.card : '#FFF' }}>
                    Start Assessment
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[20px] font-[900] text-white leading-tight">100%</p>
                  <p className="text-[11px] font-[700] uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>Balanced</p>
                </div>
                <div className="w-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[20px] font-[900] text-white leading-tight">Active</p>
                  <p className="text-[11px] font-[700] uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>Progress</p>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Personal Details */}
        <div>
          <h2 className="text-[13px] font-[800] uppercase tracking-[1.5px] mb-3 px-1 mt-6" style={{ color: colors.text }}>
            Personal Details
          </h2>
          <div 
            className="rounded-[24px] overflow-hidden border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }}
          >
            <Row icon="👤" label="Full Name (Edit)" value={displayName} arrow href="/dashboard/edit" />
            <Row icon="✉️" label="Email" value={email} />
            <Row 
              icon="🔒" 
              label="Password" 
              value={resetLoading ? "Sending..." : "Update Password"} 
              arrow 
              last 
              onClick={(e: any) => { e.preventDefault(); if (!resetLoading) handleResetPassword(); }} 
            />
          </div>
          {resetMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 mt-4 rounded-xl text-center text-[13px] font-[700]"
              style={{ 
                backgroundColor: resetMessage.includes("sent") ? colors.successBg : colors.errorBg,
                color: resetMessage.includes("sent") ? colors.successText : colors.errorText,
              }}
            >
              {resetMessage}
            </motion.div>
          )}
        </div>

        {/* Wellness Journey */}
        <div>
          <h2 className="text-[13px] font-[800] uppercase tracking-[1.5px] mb-3 px-1 mt-6" style={{ color: colors.text }}>
            Wellness Journey
          </h2>
          <div 
            className="rounded-[24px] overflow-hidden border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }}
          >
            <Row icon="🥗" label="Active Diet Plan" value={hasActivePlan ? "Standard Ayurvedic Plan" : "No active plan"} arrow href="/dashboard/meal-plan" />
            <Row icon="👨‍⚕️" label="Your Dietitian" value={dietitianName || "Connect with an expert"} arrow href="/dashboard/dietitian" />
            <Row icon="⚖️" label="Health Profile" value="Diet, Region & Goals" arrow href="/dashboard/health-profile" />
            <Row icon="📊" label="Wellness Goals" value={goalsDisplay} arrow last href="/dashboard/goals" />
          </div>
        </div>

        {/* Favorite Recipes */}
        {favorites.filter(m => m && m.name).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1 mt-6">
              <h2 className="text-[13px] font-[800] uppercase tracking-[1.5px]" style={{ color: colors.text }}>
                Favorite Recipes
              </h2>
              <Link href="/dashboard/favorites" className="text-[13px] font-[700]" style={{ color: colors.gold }}>
                View All ›
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: "none" }}>
              {favorites.map((meal, i) => {
                if (!meal || typeof meal !== 'object' || !meal.name) return null;
                const todayIdx = getTodayIndex();
                const isCompletedToday = todayMeals.some((tm, tmIdx) => tm.name === meal.name && checkedMeals[`${todayIdx}-${tmIdx}`]);
                
                return (
                  <Link
                    key={i}
                    href={
                      meal.source === "recipe-generator"
                        ? `/dashboard/recipe-detail?recipe=${encodeURIComponent(JSON.stringify(meal))}`
                        : `/dashboard/meal-detail?meal=${encodeURIComponent(JSON.stringify(meal))}`
                    }
                    className="flex-shrink-0 w-40 rounded-[20px] overflow-hidden border shadow-sm block snap-start transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }}
                  >
                    <div className="h-[110px] w-full relative">
                      <img
                        src={getFoodImageUrl(meal.imageKeyword, meal.name)}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=150&fit=crop"; }}
                      />
                      <div className="absolute bottom-2 left-2 right-2 rounded-xl py-1 px-1.5 text-center backdrop-blur-md border border-white/20" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                        <span className="text-white text-[10px] font-[800] tracking-wide">
                          {meal.emoji || "🍽️"} {meal.type || "Meal"}
                        </span>
                      </div>
                      {isCompletedToday && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-[1.5px]" style={{ backgroundColor: "#10B981", borderColor: "#FFF" }}>
                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[14px] font-[800] truncate mb-1" style={{ color: colors.text }}>{meal.name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[12px]">🔥</span>
                        <span className="text-[12px] font-[700]" style={{ color: colors.textMuted }}>{meal.calories || 0} kcal</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* App Preferences */}
        <div>
          <h2 className="text-[13px] font-[800] uppercase tracking-[1.5px] mb-3 px-1 mt-6" style={{ color: colors.text }}>
            App Preferences
          </h2>
          <div 
            className="rounded-[24px] overflow-hidden border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }}
          >
            <Row icon="🌐" label="Language" value="English (Standard)" arrow href="/dashboard/preferences" />
            <Row icon="🔔" label="Push Notifications" value={notifDisplay} arrow href="/dashboard/preferences" />
            <Row icon="🎨" label="Theme Mode" value={themeDisplay} arrow last onClick={(e: any) => { e.preventDefault(); toggleTheme(); }} />
          </div>
        </div>

        {/* Footer Area */}
        <div className="pt-8 pb-10 flex flex-col items-center">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="AyurNutri Logo" className="w-[52px] h-[52px] object-contain mb-3 opacity-90" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <h3 className="text-[22px] font-[900] tracking-tight mb-1" style={{ color: colors.text }}>AyurNutri</h3>
            <p className="text-[13px] font-[600]" style={{ color: colors.textMuted }}>v1.0.0 · All Rights Reserved</p>
          </div>
          
          <button
            onClick={signOutUser}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-[16px] border-[1.5px] transition-all hover:bg-red-500/10"
            style={{ 
              backgroundColor: isDark ? colors.surface : colors.errorBg,
              borderColor: colors.errorBorder,
            }}
          >
            <LogOut className="w-5 h-5" style={{ color: colors.errorText }} />
            <span className="text-[15px] font-[800]" style={{ color: colors.errorText }}>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Photo Selection Bottom Sheet / Modal */}
      <AnimatePresence>
        {showPhotoOptions && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoOptions(false)}
              className="fixed inset-0 bg-black/50 z-[60]"
            />
            <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center pointer-events-none p-0 md:p-6">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full md:max-w-md rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl pb-10 md:pb-6 pointer-events-auto"
                style={{ backgroundColor: colors.card }}
              >
                {/* Mobile Handle (hidden on desktop) */}
                <div className="w-10 h-1.5 rounded-full mx-auto mb-6 opacity-50 md:hidden" style={{ backgroundColor: colors.divider }} />
                
                <h3 className="text-xl font-bold text-center mb-6 md:mt-2" style={{ color: colors.text }}>Profile Photo</h3>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => { setShowPhotoOptions(false); fileInputRef.current?.click(); }}
                    className="w-full flex items-center p-3 rounded-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: `${colors.gold}15` }}>
                      <Camera className="w-6 h-6" style={{ color: colors.gold }} />
                    </div>
                    <span className="text-base font-bold" style={{ color: colors.text }}>Upload Photo</span>
                  </button>

                  {(profilePhoto || user?.photoURL) && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="w-full flex items-center p-3 rounded-2xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{ backgroundColor: `${colors.errorBg}20` }}>
                        <Trash2 className="w-6 h-6" style={{ color: colors.errorText }} />
                      </div>
                      <span className="text-base font-bold" style={{ color: colors.errorText }}>Remove Current Photo</span>
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowPhotoOptions(false)}
                  className="w-full h-14 rounded-2xl mt-5 font-bold text-base transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: isDark ? colors.surface : colors.background, color: colors.text }}
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function
function getFoodImageUrl(keyword?: string, fallbackName?: string): string {
  const term = keyword || fallbackName || "indian food";
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(term + " food recipe")}&w=300&h=200&c=7&rs=1&p=0`;
}
