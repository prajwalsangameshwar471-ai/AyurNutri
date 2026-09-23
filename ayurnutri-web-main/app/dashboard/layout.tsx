"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import * as firestore from "@/lib/firestore";
import { getInitials } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import logo from "@/images/logo.png";
import {
    Calendar,
    ChefHat,
    Home,
    LogOut,
    Menu,
    MessageCircle,
    Moon,
    Scan,
    Sparkles,
    Sun,
    User,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/meal-plan", label: "Meal Plan", icon: Calendar },
  { href: "/dashboard/dosha", label: "Dosha", icon: Sparkles },
  { href: "/dashboard/recipes", label: "Recipes", icon: ChefHat },
  { href: "/dashboard/chat", label: "Vaidya AI", icon: MessageCircle },
  { href: "/dashboard/scanner", label: "Scanner", icon: Scan },
  { href: "/dashboard/dietitian", label: "Dietitian", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOutUser } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubProfile = firestore.subscribeToProfile(user.uid, (data) => {
      if (data?.photoURL) setProfilePhoto(data.photoURL);
    });
    return () => unsubProfile();
  }, [user?.uid]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.gold }} />
      </div>
    );
  }

  const displayName = user.displayName || "Guest";
  const initials = getInitials(displayName);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <Image src={logo} alt="AyurNutri Logo" className="w-10 h-10 object-contain rounded-xl" />
        <span className="font-black text-xl tracking-wider" style={{ color: colors.text }}>
          AyurNutri
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? `${colors.gold}15` : "transparent",
                color: isActive ? colors.gold : colors.textSecondary,
              }}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colors.gold }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t" style={{ borderColor: colors.divider }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full mb-2 transition-all hover:opacity-80"
          style={{ color: colors.textSecondary }}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="font-semibold">{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <Link
          href="/dashboard/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{ backgroundColor: colors.surface }}
        >
          {profilePhoto || user.photoURL ? (
            <img 
              src={profilePhoto || user.photoURL || ""} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover"
              style={{ border: `2px solid ${colors.gold}50` }}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: colors.text }}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: colors.textMuted }}>View Profile</p>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={signOutUser}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full mt-2 transition-all hover:opacity-80"
          style={{ color: colors.errorText }}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div 
      className="flex w-full fixed inset-0 overflow-hidden" 
      style={{ backgroundColor: colors.background }}
    >
      {/* Desktop Sidebar */}
      <aside 
        className="hidden lg:flex flex-col w-72 fixed h-full border-r"
        style={{ 
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-72 z-50 flex flex-col lg:hidden"
              style={{ 
                backgroundColor: colors.card,
              }}
            >
              <div className="flex items-center justify-between p-4">
                <span className="font-black text-xl tracking-wider" style={{ color: colors.text }}>
                  AyurNutri
                </span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg"
                  style={{ color: colors.text }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main 
        className="flex-1 lg:ml-72 flex flex-col h-full w-full min-w-0"
      >
        {/* Mobile Header */}
        <header 
          className="lg:hidden flex items-center justify-between p-4 flex-shrink-0 border-b"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }}
        >
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ color: colors.text }}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black text-lg tracking-wider" style={{ color: colors.text }}>
            AyurNutri
          </span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <div 
          className={`flex-1 w-full min-h-0 overflow-y-auto ${
            pathname === '/dashboard/chat' 
              ? 'p-2 lg:p-4' 
              : pathname === '/dashboard/recipe-detail'
                ? 'p-0 lg:p-8'
                : 'p-2 lg:p-8'
          }`}
        >
          {children}
        </div>
      </main>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
}
