"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PreferencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark, setThemeMode: setGlobalThemeMode } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [themeMode, setThemeModeLocal] = useState<'light' | 'dark' | 'system'>(isDark ? 'dark' : 'light');
  const [language, setLanguage] = useState('English');
  const [showLangModal, setShowLangModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore.subscribeToPreferences(user.uid, (data) => {
      if (data) {
        setNotifications(data.notifications ?? true);
        setDailyReminders(data.dailyReminders ?? true);
        const mode = data.themeMode || (data.darkMode ? 'dark' : 'light');
        setThemeModeLocal(mode);
        if (data.language) setLanguage(data.language);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeLocal(mode);
    setGlobalThemeMode(mode);
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await firestore.savePreferences(user.uid, {
        notifications,
        dailyReminders,
        themeMode,
        darkMode: themeMode === 'dark',
        language,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      setLoading(false);
    }
  };

  const SettingRow = ({ icon, title, description, value, onValueChange, last }: any) => (
    <div 
      className={`flex flex-row items-center py-3.5 ${!last ? 'border-b' : ''}`}
      style={{ borderColor: colors.divider }}
    >
      <div 
        className="w-11 h-11 rounded-[14px] flex items-center justify-center mr-3.5 shrink-0"
        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
      >
        <span className="text-[20px]">{icon}</span>
      </div>
      <div className="flex-1 pr-4">
        <p className="text-[15px] font-[700] mb-0.5" style={{ color: colors.text }}>{title}</p>
        <p className="text-[12px]" style={{ color: colors.textMuted }}>{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={value}
          onChange={(e) => onValueChange(e.target.checked)}
        />
        <div 
          className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
          style={{ backgroundColor: value ? colors.green : colors.divider }}
        ></div>
      </label>
    </div>
  );

  const LangOption = ({ label, code }: { label: string, code: string }) => (
    <button 
      onClick={() => {
        setLanguage(code);
        setShowLangModal(false);
      }}
      className="w-full flex items-center justify-between py-4 border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      style={{ borderColor: colors.divider }}
    >
      <span className="text-[15px] font-[700]" style={{ color: colors.text }}>{label}</span>
      {language === code && <CheckCircle2 className="w-6 h-6" style={{ color: colors.green }} />}
    </button>
  );

  return (
    <div className="min-h-[100dvh] pb-6" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div 
        className="px-6 pt-10 pb-6 rounded-b-[32px] shadow-sm z-10 relative flex items-center border-b"
        style={{ backgroundColor: colors.background, borderColor: colors.divider }}
      >
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 border shadow-sm"
          style={{ 
            backgroundColor: colors.card, 
            borderColor: isDark ? colors.cardBorder : "transparent"
          }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
        </button>
        <h1 className="text-[18px] font-[800] text-center flex-1 pr-11" style={{ color: colors.text }}>
          Preferences
        </h1>
      </div>

      <div className="px-5 pt-6 max-w-xl mx-auto space-y-6">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border text-center"
            style={{ backgroundColor: colors.successBg, borderColor: colors.successBorder }}
          >
            <span className="text-[13px] font-[600]" style={{ color: colors.successText }}>
              Preferences saved successfully!
            </span>
          </motion.div>
        )}

        {/* Notifications */}
        <div>
          <h2 className="text-[11px] font-[700] uppercase tracking-[2px] mb-2.5 ml-1" style={{ color: colors.text }}>
            Notifications
          </h2>
          <div 
            className="rounded-[20px] px-4 py-2 shadow-sm border"
            style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent" }}
          >
            <SettingRow 
              icon="🔔" 
              title="Push Notifications" 
              description="Get updates and alerts" 
              value={notifications} 
              onValueChange={setNotifications} 
            />
            <SettingRow 
              icon="⏰" 
              title="Daily Reminders" 
              description="Meal & goal check-ins" 
              value={dailyReminders} 
              onValueChange={setDailyReminders} 
              last 
            />
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h2 className="text-[11px] font-[700] uppercase tracking-[2px] mb-2.5 ml-1" style={{ color: colors.text }}>
            Appearance
          </h2>
          <div 
            className="rounded-[20px] px-4 py-3.5 shadow-sm border"
            style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent" }}
          >
            <div className="flex flex-row items-center mb-4">
              <div 
                className="w-11 h-11 rounded-[14px] flex items-center justify-center mr-3.5"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                <span className="text-[20px]">🎨</span>
              </div>
              <div className="flex-1 pr-4">
                <p className="text-[15px] font-[700] mb-0.5" style={{ color: colors.text }}>Theme Mode</p>
                <p className="text-[12px]" style={{ color: colors.textMuted }}>Choose your app appearance</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((mode) => {
                const active = themeMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange(mode)}
                    className="flex-1 py-2.5 rounded-xl border text-[13px] capitalize transition-colors"
                    style={{
                      backgroundColor: active ? colors.green : "transparent",
                      borderColor: active ? colors.green : colors.divider,
                      color: active ? (isDark ? colors.gold : "#FFF") : colors.text,
                      fontWeight: active ? "700" : "500"
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Language */}
        <div>
          <h2 className="text-[11px] font-[700] uppercase tracking-[2px] mb-2.5 ml-1" style={{ color: colors.text }}>
            Language
          </h2>
          <button
            onClick={() => setShowLangModal(true)}
            className="w-full flex items-center rounded-[20px] px-4 py-3.5 shadow-sm border transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : "transparent" }}
          >
            <div 
              className="w-11 h-11 rounded-[14px] flex items-center justify-center mr-3.5 shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
              <span className="text-[20px]">🌐</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-[700] mb-0.5" style={{ color: colors.text }}>App Language</p>
              <p className="text-[12px]" style={{ color: colors.textMuted }}>
                {language === 'English' ? 'English (US)' : language === 'Hindi' ? 'Hindi (हिन्दी)' : language === 'Spanish' ? 'Spanish (Español)' : 'French (Français)'}
              </p>
            </div>
            <span className="text-[22px] font-[600] px-2" style={{ color: colors.gold }}>›</span>
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 rounded-[16px] flex items-center justify-center shadow-sm transition-opacity hover:opacity-80 disabled:opacity-50 mt-8"
          style={{ backgroundColor: colors.primaryBtn }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.gold }} />
          ) : (
            <span className="text-[16px] font-[800] tracking-wide" style={{ color: colors.primaryBtnText }}>
              Save Preferences
            </span>
          )}
        </button>
      </div>

      {/* Language Modal */}
      <AnimatePresence>
        {showLangModal && (
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
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10"
              style={{ backgroundColor: colors.card }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-[800]" style={{ color: colors.text }}>Select Language</h3>
                <button 
                  onClick={() => setShowLangModal(false)}
                  className="p-1 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-6 h-6" style={{ color: colors.text }} />
                </button>
              </div>
              <div className="flex flex-col">
                <LangOption label="English" code="English" />
                <LangOption label="Hindi (हिन्दी)" code="Hindi" />
                <LangOption label="Spanish (Español)" code="Spanish" />
                <LangOption label="French (Français)" code="French" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
