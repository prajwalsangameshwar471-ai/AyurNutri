"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Loader2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface Question {
  section: "physical" | "mental";
  title: string;
  emoji: string;
  options: { label: string; dosha: "vata" | "pitta" | "kapha" }[];
}

const QUESTIONS: Question[] = [
  {
    section: "physical",
    title: "Body Frame",
    emoji: "🏋️",
    options: [
      { label: "Thin, bony and small framed. Hardly gain weight.", dosha: "vata" },
      { label: "Medium built. Can gain or lose weight easily.", dosha: "pitta" },
      { label: "Large built. Gain weight easily but difficult to lose.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Walk & Talk",
    emoji: "🚶",
    options: [
      { label: "Fast walk and talk.", dosha: "vata" },
      { label: "Moderate and determined walk.", dosha: "pitta" },
      { label: "Slow and steady walk.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Weather Reaction",
    emoji: "🌦️",
    options: [
      { label: "Enjoy warm climate but feel uncomfortable in cool weather.", dosha: "vata" },
      { label: "Enjoy cool weather and dislike warm climate.", dosha: "pitta" },
      { label: "Comfortable for most of year but prefer summer.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Sweating",
    emoji: "💧",
    options: [
      { label: "Sweat little but not much. Minimal body odour.", dosha: "vata" },
      { label: "Sweat a lot. Medium body odour.", dosha: "pitta" },
      { label: "Sweat moderately but a lot when working hard.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Appetite",
    emoji: "🍽️",
    options: [
      { label: "Irregular. Sometimes hungry, sometimes not.", dosha: "vata" },
      { label: "Strong and sharp. Always feel hungry.", dosha: "pitta" },
      { label: "Decent appetite. Tendency to eat for comfort.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Skin",
    emoji: "✋",
    options: [
      { label: "Normal to dry, rough, thin and cool.", dosha: "vata" },
      { label: "Normal to oily, soft, reddish, sensitive.", dosha: "pitta" },
      { label: "Normal to oily, soft, thick and cool.", dosha: "kapha" },
    ],
  },
  {
    section: "physical",
    title: "Hair",
    emoji: "💇",
    options: [
      { label: "Rough, dry and wavy. Get split ends easily.", dosha: "vata" },
      { label: "Normal, straight, thin and brownish.", dosha: "pitta" },
      { label: "Thick, curly and oily. Darker color.", dosha: "kapha" },
    ],
  },
  {
    section: "mental",
    title: "Memory",
    emoji: "🧠",
    options: [
      { label: "Quick to learn but quick to forget.", dosha: "vata" },
      { label: "Average speed. Once learnt, never forgets.", dosha: "pitta" },
      { label: "Slow to learn but remembers for long.", dosha: "kapha" },
    ],
  },
  {
    section: "mental",
    title: "Mind",
    emoji: "🧘",
    options: [
      { label: "Mind tends to get restless easily.", dosha: "vata" },
      { label: "Mind gets impatient or aggressive easily.", dosha: "pitta" },
      { label: "Mind remains cool and calm.", dosha: "kapha" },
    ],
  },
  {
    section: "mental",
    title: "Sleep Quality",
    emoji: "😴",
    options: [
      { label: "Light and disturbed sleep.", dosha: "vata" },
      { label: "Moderate but regular.", dosha: "pitta" },
      { label: "Deep and heavy.", dosha: "kapha" },
    ],
  },
  {
    section: "mental",
    title: "Emotional Nature",
    emoji: "💛",
    options: [
      { label: "Worry a lot. Often feel nervous.", dosha: "vata" },
      { label: "Often get irritable and angry.", dosha: "pitta" },
      { label: "Loving and caring. Hard to anger.", dosha: "kapha" },
    ],
  },
];

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

const DOSHA_ELEMENTS: Record<string, string> = {
  Vata: "Air + Space",
  Pitta: "Fire + Water",
  Kapha: "Earth + Water",
  "Vata-Pitta": "Air + Fire",
  "Pitta-Kapha": "Fire + Earth",
  "Vata-Kapha": "Air + Earth",
  Tridosha: "All Five Elements",
};

function calculateResult(answers: Record<number, "vata" | "pitta" | "kapha">): string {
  let v = 0, p = 0, k = 0;
  Object.values(answers).forEach((d) => {
    if (d === "vata") v++;
    else if (d === "pitta") p++;
    else k++;
  });
  const total = v + p + k;
  const threshold = total * 0.45;
  if (v >= threshold && p < threshold && k < threshold) return "Vata";
  if (p >= threshold && v < threshold && k < threshold) return "Pitta";
  if (k >= threshold && v < threshold && p < threshold) return "Kapha";
  if (v >= p && v >= k && p > k) return "Vata-Pitta";
  if (p >= v && p >= k && k > v) return "Pitta-Kapha";
  if (v >= p && k >= p && v <= k + 2 && k <= v + 2) return "Vata-Kapha";
  if (Math.abs(v - p) <= 1 && Math.abs(p - k) <= 1) return "Tridosha";
  if (v >= p && v >= k) return "Vata";
  if (p >= v && p >= k) return "Pitta";
  return "Kapha";
}

function DoshaContent() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "vata" | "pitta" | "kapha">>({});
  const [result, setResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [hasTaken, setHasTaken] = useState(false);
  const [scores, setScores] = useState({ v: 0, p: 0, k: 0 });

  const searchParams = useSearchParams();
  const isRetaking = searchParams.get("retake") === "true";

  useEffect(() => {
    if (!user?.uid) return;
    let isFirstSnapshot = true;
    
    const unsub = firestore.subscribeToDoshaResult(user.uid, (data) => {
      if (data?.doshaType) {
        if (isFirstSnapshot && isRetaking) {
          isFirstSnapshot = false;
          return;
        }
        isFirstSnapshot = false;
        setResult(data.doshaType);
        setHasTaken(true);
        if (data.aiAnalysis) {
          try {
            setAiResult(JSON.parse(data.aiAnalysis));
          } catch {}
        }
        setScores({
          v: data.vataScore || 0,
          p: data.pittaScore || 0,
          k: data.kaphaScore || 0,
        });
      }
    });
    
    return () => unsub();
  }, [user?.uid, isRetaking]);

  const selectOption = async (dosha: "vata" | "pitta" | "kapha") => {
    const newAnswers = { ...answers, [currentQ]: dosha };
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const doshaResult = calculateResult(newAnswers);
      setResult(doshaResult);

      let vS = 0, pS = 0, kS = 0;
      Object.values(newAnswers).forEach((d) => {
        if (d === "vata") vS++;
        else if (d === "pitta") pS++;
        else kS++;
      });
      setScores({ v: vS, p: pS, k: kS });

      if (user?.uid) {
        await firestore.saveDoshaResult(user.uid, {
          doshaType: doshaResult,
          vataScore: vS,
          pittaScore: pS,
          kaphaScore: kS,
          aiAnalysis: "",
          answers: Object.values(newAnswers),
        });

        // Simulate AI analysis
        setAiLoading(true);
        setTimeout(() => {
          const mockAIResult = {
            summary: `Your ${doshaResult} constitution indicates a unique balance of energies. This dosha type influences your physical characteristics, mental tendencies, and optimal wellness practices.`,
            strengths: ["Quick learning ability", "Creative thinking", "Adaptability", "Strong communication"],
            challenges: ["May experience anxiety when stressed", "Irregular digestion patterns", "Tendency to overthink"],
            dietTips: ["Favor warm, cooked foods", "Include healthy fats like ghee", "Avoid cold and raw foods", "Eat at regular intervals"],
            lifestyleTips: ["Maintain regular sleep schedule", "Practice grounding activities", "Engage in moderate exercise", "Meditate daily"],
            yogaPoses: ["Child's Pose (Balasana)", "Mountain Pose (Tadasana)", "Warrior II (Virabhadrasana II)", "Corpse Pose (Savasana)"],
            herbs: ["Ashwagandha for stress relief", "Brahmi for mental clarity", "Triphala for digestion", "Tulsi for immunity"],
            seasonalAdvice: "During autumn, focus on warming foods and routines to balance the airy Vata qualities of the season.",
          };
          setAiResult(mockAIResult);
          setAiLoading(false);
          firestore.saveDoshaResult(user.uid, {
            doshaType: doshaResult,
            vataScore: vS,
            pittaScore: pS,
            kaphaScore: kS,
            aiAnalysis: JSON.stringify(mockAIResult),
            answers: Object.values(newAnswers),
          });
        }, 2000);
      }
    }
  };

  const goBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    }
  };

  const resetQuiz = () => {
    setResult(null);
    setAnswers({});
    setCurrentQ(0);
    setAiResult(null);
  };

  // Result View
  if (result) {
    const color = DOSHA_COLORS[result] || colors.green;
    const emoji = DOSHA_EMOJIS[result] || "🧘";
    const element = DOSHA_ELEMENTS[result] || "";
    const totalAnswered = QUESTIONS.length;

    return (
      <div className="w-full min-w-0 max-w-3xl mx-auto space-y-4 lg:space-y-6 pb-6 overflow-x-hidden lg:overflow-visible">
        {/* Result Header */}
        <div 
          className="rounded-[24px] lg:rounded-3xl p-6 lg:p-8 text-center"
          style={{ backgroundColor: color }}
        >
          <span className="text-6xl mb-4 block">{emoji}</span>
          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            Your Dosha Type
          </p>
          <h1 className="text-5xl font-black mb-2" style={{ color: "#fff" }}>{result}</h1>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>{element}</p>
        </div>

        {/* Score Breakdown */}
        <div 
          className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>📊 Score Breakdown</h2>
          {[
            { label: "Vata", count: scores.v, color: "#5B8FB9" },
            { label: "Pitta", count: scores.p, color: "#E07A5F" },
            { label: "Kapha", count: scores.k, color: "#6A994E" },
          ].map(({ label, count, color }) => {
            const pct = Math.round((count / totalAnswered) * 100);
            return (
              <div key={label} className="flex items-center gap-4 mb-3">
                <span className="w-14 font-bold text-sm" style={{ color: colors.text }}>{label}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="w-10 text-right font-bold text-sm" style={{ color: colors.textSecondary }}>{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* AI Analysis */}
        {aiLoading ? (
          <div 
            className="rounded-[24px] lg:rounded-3xl p-6 lg:p-8 text-center border"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
          >
            <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" style={{ color }} />
            <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>🤖 Gemini AI is analyzing...</h3>
            <p style={{ color: colors.textMuted }}>Generating your personalized Ayurvedic wellness plan</p>
          </div>
        ) : aiResult ? (
          <div className="space-y-4">
            {/* Summary */}
            <div 
              className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
              style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
            >
              <h3 className="font-bold text-lg mb-3" style={{ color: colors.text }}>🤖 AI-Powered Analysis</h3>
              <p className="italic leading-relaxed" style={{ color: colors.textSecondary }}>{aiResult.summary}</p>
            </div>

            {/* Sections */}
            {[
              { title: "Your Strengths", emoji: "💪", items: aiResult.strengths },
              { title: "Watch Out For", emoji: "⚠️", items: aiResult.challenges },
              { title: "Diet Recommendations", emoji: "🍲", items: aiResult.dietTips },
              { title: "Lifestyle Tips", emoji: "🌅", items: aiResult.lifestyleTips },
              { title: "Yoga & Exercise", emoji: "🧘", items: aiResult.yogaPoses },
              { title: "Beneficial Herbs", emoji: "🌿", items: aiResult.herbs },
            ].map((section) => (
              <div 
                key={section.title}
                className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
              >
                <h3 className="font-bold text-lg mb-3" style={{ color: colors.text }}>
                  {section.emoji} {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items?.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span style={{ color: colors.gold }}>•</span>
                      <span style={{ color: colors.textSecondary }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Seasonal Advice */}
            <div 
              className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6 border"
              style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
            >
              <h3 className="font-bold text-lg mb-3" style={{ color: colors.text }}>📅 Seasonal Advice</h3>
              <p style={{ color: colors.textSecondary }}>{aiResult.seasonalAdvice}</p>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={resetQuiz}
            className="flex-1 py-4 rounded-2xl font-bold"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          >
            Retake Assessment
          </button>
          {!hasTaken && (
            <a
              href="/dashboard"
              className="flex-1 py-4 rounded-2xl font-bold text-center"
              style={{ backgroundColor: color, color: "#fff" }}
            >
              Done
            </a>
          )}
        </div>
      </div>
    );
  }

  // Quiz View
  const q = QUESTIONS[currentQ];
  const progress = (currentQ + 1) / QUESTIONS.length;
  const isPhysical = q?.section === "physical";

  return (
    <div className="w-full min-w-0 max-w-2xl mx-auto space-y-4 lg:space-y-6 pb-6 overflow-x-hidden lg:overflow-visible">
      {/* Quiz Header */}
      <div 
        className="rounded-[24px] lg:rounded-3xl p-4 lg:p-6"
        style={{ backgroundColor: isPhysical ? colors.green : "#C2185B" }}
      >
        <div className="flex items-center justify-between mb-4">
          <a 
            href="/dashboard"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <X className="w-5 h-5 text-white" />
          </a>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            {isPhysical ? "Physical" : "Mental & Emotional"}
          </span>
          <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
            {currentQ + 1}/{QUESTIONS.length}
          </span>
        </div>

        {/* Progress */}
        <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${progress * 100}%`, backgroundColor: colors.gold }}
          />
        </div>

        <div className="text-center">
          <span className="text-5xl mb-4 block">{q.emoji}</span>
          <h1 className="text-2xl font-bold text-white">{q.title}</h1>
        </div>
      </div>

      {/* Options */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-3"
        >
          {q.options.map((opt, i) => {
            const isSelected = answers[currentQ] === opt.dosha;
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={i}
                onClick={() => selectOption(opt.dosha)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: isSelected ? `${colors.gold}10` : colors.card,
                  borderColor: isSelected ? colors.gold : colors.cardBorder,
                }}
              >
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
                  style={{ 
                    backgroundColor: isSelected ? colors.green : colors.surface,
                    color: isSelected ? "#fff" : colors.text,
                  }}
                >
                  {letter}
                </div>
                <span className="flex-1 font-medium" style={{ color: isSelected ? colors.text : colors.textSecondary }}>
                  {opt.label}
                </span>
                {isSelected && <Check className="w-5 h-5" style={{ color: colors.gold }} />}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Back Button */}
      {currentQ > 0 && (
        <button
          onClick={goBack}
          className="mt-6 px-6 py-3 rounded-xl font-bold flex items-center gap-2"
          style={{ backgroundColor: colors.card, color: colors.text }}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
      )}
    </div>
  );
}

export default function DoshaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin opacity-50" />
      </div>
    }>
      <DoshaContent />
    </Suspense>
  );
}
