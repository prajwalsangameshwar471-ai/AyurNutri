"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import logo from "@/images/logo.png";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || "Failed to send reset email.");
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
        </motion.div>

        {/* Forgot Password Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mx-auto rounded-3xl p-8 shadow-xl"
          style={{ backgroundColor: colors.card }}
        >
          <div className="text-center mb-6">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${colors.gold}20` }}
            >
              <Mail className="w-8 h-8" style={{ color: colors.gold }} />
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>
              Reset Password
            </h2>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Enter your email to receive reset instructions
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.successText }} />
              <p className="font-semibold mb-2" style={{ color: colors.text }}>
                Email Sent!
              </p>
              <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
                Check your inbox for password reset instructions.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
                style={{ color: colors.green }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div 
                  className="p-3 rounded-xl text-sm text-center"
                  style={{ backgroundColor: colors.errorBg, color: colors.errorText }}
                >
                  {error}
                </div>
              )}

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

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] disabled:opacity-50 mt-6"
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
                  "Send Reset Link"
                )}
              </button>

              <div className="text-center mt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                  style={{ color: colors.textMuted }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
