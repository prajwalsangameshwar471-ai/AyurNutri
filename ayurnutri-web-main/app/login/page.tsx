"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import logo from "@/images/logo.png";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.push("/dashboard");
    } catch (e: any) {
      const code = e?.code || "";
      if (code.includes("not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
        setError("Invalid email or password.");
      } else if (code.includes("invalid-email")) {
        setError("Please enter a valid email.");
      } else {
        setError(e?.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.headerBg }}>
      {/* Header Background */}
      <div className="h-1/2 absolute top-0 left-0 right-0" style={{ backgroundColor: colors.headerBg }} />
      
      {/* Body Background */}
      <div 
        className="h-[58%] absolute bottom-0 left-0 right-0 rounded-t-[40px]"
        style={{ backgroundColor: colors.background }}
      />

      <div className="relative z-10 flex-1 flex flex-col px-6 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 pt-8"
        >
          <div className="flex justify-center mb-4">
            <Image src={logo} alt="AyurNutri Logo" className="w-20 h-20 object-contain drop-shadow-xl" />
          </div>
          <h1 className="text-3xl font-black tracking-wider mb-1" style={{ color: colors.cream }}>
            AyurNutri
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{ color: colors.textOnHeaderSub }}>
            Your Wellness Journey
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mx-auto rounded-3xl p-8 shadow-xl"
          style={{ backgroundColor: colors.card }}
        >
          <h2 className="text-2xl font-bold text-center mb-1" style={{ color: colors.text }}>
            Welcome Back
          </h2>
          <p className="text-center mb-6 text-sm" style={{ color: colors.textMuted }}>
            Sign in to continue
          </p>

          {error && (
            <div 
              className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ backgroundColor: colors.errorBg, color: colors.errorText }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold tracking-wider uppercase mb-2 block" style={{ color: colors.text }}>
                Email
              </label>
              <div 
                className="flex items-center px-4 h-14 rounded-2xl border"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder }}
              >
                <Mail className="w-5 h-5 mr-3 opacity-40" style={{ color: colors.text }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.inputText }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold tracking-wider uppercase mb-2 block" style={{ color: colors.text }}>
                Password
              </label>
              <div 
                className="flex items-center px-4 h-14 rounded-2xl border"
                style={{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder }}
              >
                <Lock className="w-5 h-5 mr-3 opacity-40" style={{ color: colors.text }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: colors.inputText }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="opacity-40 hover:opacity-60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link 
                href="/forgot-password"
                className="text-sm font-semibold hover:underline"
                style={{ color: colors.green }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ 
                backgroundColor: colors.primaryBtn,
                color: colors.primaryBtnText,
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: colors.gold }} />
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center mt-6 text-sm" style={{ color: colors.textMuted }}>
            Don&apos;t have an account?{" "}
            <Link 
              href="/signup"
              className="font-bold hover:underline"
              style={{ color: colors.green }}
            >
              Create one
            </Link>
          </p>
        </motion.div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link 
            href="/"
            className="text-sm hover:underline"
            style={{ color: colors.textOnHeaderSub }}
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
