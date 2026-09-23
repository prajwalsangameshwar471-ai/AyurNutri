"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { Leaf, LineChart, Sparkles, Utensils, Brain, Camera, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import logo from "@/images/logo.png";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const { scrollYProgress } = useScroll();
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.gold }} />
      </div>
    );
  }

  const bgColor = isDark ? "#0A1A12" : "#143A24";
  const textColor = "#FDF8F0";
  const textMuted = "rgba(253,248,240,0.7)";

  return (
    <div className="min-h-screen relative selection:bg-yellow-500/30 text-[#FDF8F0] font-sans" style={{ backgroundColor: bgColor }}>
      {/* Dynamic Background Overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(212, 162, 78, 0.15) 0%, transparent 70%)" }} />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b border-white/5 bg-black/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Image src={logo} alt="AyurNutri Logo" className="w-8 h-8 object-contain rounded-md" />
            <span className="font-black text-xl tracking-wide">AyurNutri</span>
          </div>
          <button 
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 rounded-full font-bold text-sm transition-all hover:bg-white/10 border border-white/20"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-20 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, type: "spring" }} className="mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.gold}20, ${colors.gold}40)`, border: `2px solid ${colors.gold}50` }}>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: colors.gold }} />
              <Image src={logo} alt="AyurNutri Logo" className="w-16 h-16 md:w-24 md:h-24 object-contain relative z-10" />
            </div>
          </motion.div>

          <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            AyurNutri
          </motion.h1>
          
          <motion.p initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-base md:text-xl font-medium max-w-2xl mb-10" style={{ color: textMuted }}>
            The world's first AI-powered Ayurvedic diet and wellness platform. Personalized for your unique Dosha.
          </motion.p>

          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button onClick={() => router.push("/login")} className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-xl shadow-yellow-900/20" style={{ backgroundColor: colors.gold, color: "#1B4332" }}>
              Start Your Journey <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-white/5 border border-white/20">
              Learn More
            </button>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-6 relative z-10 bg-black/20 border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xs md:text-sm font-black tracking-[0.2em] uppercase mb-3" style={{ color: colors.gold }}>The Philosophy</h2>
          <h3 className="text-2xl md:text-4xl font-black mb-6 leading-tight">Ancient Wisdom Meets<br/>Modern Intelligence</h3>
          <p className="text-base md:text-lg leading-relaxed" style={{ color: textMuted }}>
            Ayurveda teaches us that every body is unique, governed by three fundamental energies called Doshas (Vata, Pitta, Kapha). What heals one person may harm another. 
            <br/><br/>
            AyurNutri blends 5,000 years of holistic Indian medicine with the cutting-edge reasoning capabilities of Google Gemini AI to analyze your body type and instantly generate meal plans, recipes, and wellness tracking that is 100% personalized to you.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs md:text-sm font-black tracking-[0.2em] uppercase mb-3" style={{ color: colors.gold }}>Platform Features</h2>
            <h3 className="text-2xl md:text-4xl font-black">Everything you need to balance your Dosha.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Feature 1 */}
            <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${colors.gold}20` }}>
                <Brain className="w-6 h-6" style={{ color: colors.gold }} />
              </div>
              <h4 className="text-xl font-black mb-3">AI Dosha Analysis</h4>
              <p className="text-base leading-relaxed" style={{ color: textMuted }}>Take our comprehensive questionnaire and let Gemini AI deeply analyze your physical, mental, and emotional traits to determine your precise Dosha balance (Prakriti).</p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${colors.gold}20` }}>
                <LineChart className="w-6 h-6" style={{ color: colors.gold }} />
              </div>
              <h4 className="text-xl font-black mb-3">Smart Meal Planning</h4>
              <p className="text-base leading-relaxed" style={{ color: textMuted }}>Automatically generate a full week of highly nutritious, Dosha-balancing meals. Say goodbye to generic diets and hello to food that actually makes you feel incredible.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${colors.gold}20` }}>
                <Utensils className="w-6 h-6" style={{ color: colors.gold }} />
              </div>
              <h4 className="text-xl font-black mb-3">Instant Recipe Generator</h4>
              <p className="text-base leading-relaxed" style={{ color: textMuted }}>Have ingredients but don't know what to make? Tell our AI what you're craving, and it will instantly invent a delicious, Ayurvedic-compliant recipe with step-by-step instructions.</p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${colors.gold}20` }}>
                <Camera className="w-6 h-6" style={{ color: colors.gold }} />
              </div>
              <h4 className="text-xl font-black mb-3">Food Scanner AI</h4>
              <p className="text-base leading-relaxed" style={{ color: textMuted }}>Not sure if a meal is good for you? Snap a photo of any food, and our AI will analyze its ingredients, qualities (Gunas), and tell you exactly how it impacts your Dosha.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-6 relative z-10 bg-black/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs md:text-sm font-black tracking-[0.2em] uppercase mb-3" style={{ color: colors.gold }}>Simple Process</h2>
            <h3 className="text-2xl md:text-4xl font-black">How AyurNutri Works</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center relative">
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-[2px] bg-white/10 z-0" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-[3px] border-[#0A1A12] flex items-center justify-center text-2xl font-black mb-4" style={{ backgroundColor: colors.gold, color: "#1B4332" }}>1</div>
              <h4 className="text-lg font-bold mb-2">Take the Quiz</h4>
              <p className="text-sm md:text-base" style={{ color: textMuted }}>Answer questions about your body and habits to discover your Dosha.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-[3px] border-[#0A1A12] flex items-center justify-center text-2xl font-black mb-4" style={{ backgroundColor: colors.gold, color: "#1B4332" }}>2</div>
              <h4 className="text-lg font-bold mb-2">Get Your Plan</h4>
              <p className="text-sm md:text-base" style={{ color: textMuted }}>Receive your fully personalized AI-generated weekly diet plan.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-[3px] border-[#0A1A12] flex items-center justify-center text-2xl font-black mb-4" style={{ backgroundColor: colors.gold, color: "#1B4332" }}>3</div>
              <h4 className="text-lg font-bold mb-2">Track & Thrive</h4>
              <p className="text-sm md:text-base" style={{ color: textMuted }}>Log meals, generate recipes, and chat with Vaidya AI to stay balanced.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto">
          <Image src={logo} alt="AyurNutri Logo" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 object-contain" />
          <h2 className="text-3xl md:text-4xl font-black mb-6">Ready to balance your life?</h2>
          <button onClick={() => router.push("/login")} className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-2xl mx-auto" style={{ backgroundColor: colors.gold, color: "#1B4332" }}>
            Create Free Account <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-sm opacity-50 relative z-10">
        <p>© {new Date().getFullYear()} AyurNutri. All rights reserved.</p>
      </footer>
    </div>
  );
}
