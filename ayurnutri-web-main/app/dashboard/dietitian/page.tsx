"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as firestore from "@/lib/firestore";
import { motion } from "framer-motion";
import { Award, Check, MapPin, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

interface Dietitian {
  id: string;
  name: string;
  clinic: string;
  bamsNumber: string;
  experience: string;
}

export default function DietitianPage() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [dietitians, setDietitians] = useState<Dietitian[]>([]);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDietitians = async () => {
      const list = await firestore.getAvailableDietitians();
      setDietitians(list);
      setLoading(false);
    };
    loadDietitians();

    if (user?.uid) {
      const unsub = firestore.subscribeToDietitianConnection(user.uid, (data) => {
        setConnectedId(data?.dietitianId || null);
      });
      return unsub;
    }
  }, [user?.uid]);

  const connect = async (id: string) => {
    if (!user?.uid) return;
    await firestore.connectDietitian(user.uid, id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.gold }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>Connect with a Dietitian</h1>
        <p style={{ color: colors.textMuted }}>Get personalized guidance from certified Ayurvedic practitioners</p>
      </div>

      {/* Dietitian List */}
      <div className="space-y-4">
        {dietitians.map((dt, i) => {
          const isConnected = connectedId === dt.id;
          return (
            <motion.div
              key={dt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl p-6 border"
              style={{ 
                backgroundColor: isConnected ? `${colors.gold}08` : colors.card,
                borderColor: isConnected ? `${colors.gold}30` : colors.cardBorder,
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${colors.gold}15` }}
                >
                  <Stethoscope className="w-8 h-8" style={{ color: colors.gold }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg" style={{ color: colors.text }}>{dt.name}</h3>
                    {isConnected && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: "#10B981", color: "#fff" }}
                      >
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-1" style={{ color: colors.textMuted }}>
                    <MapPin className="w-4 h-4" />
                    {dt.clinic}
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-3" style={{ color: colors.textMuted }}>
                    <Award className="w-4 h-4" />
                    {dt.bamsNumber}
                  </div>
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-sm font-semibold px-3 py-1 rounded-lg"
                      style={{ backgroundColor: colors.surface, color: colors.text }}
                    >
                      {dt.experience} Experience
                    </span>
                    <button
                      onClick={() => connect(dt.id)}
                      disabled={isConnected}
                      className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                      style={{ 
                        backgroundColor: isConnected ? "#10B981" : colors.primaryBtn,
                        color: isConnected ? "#fff" : colors.primaryBtnText,
                      }}
                    >
                      {isConnected ? (
                        <>
                          <Check className="w-4 h-4" />
                          Connected
                        </>
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
