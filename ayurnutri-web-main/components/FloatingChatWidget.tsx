"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  clearChatHistory,
  getRecentChatMessages,
  saveChatMessage,
  subscribeToDoshaResult,
  subscribeToGoals,
  subscribeToMealPlanWeek,
  subscribeToOnboarding,
} from "@/lib/firestore";
import { callLLM } from "@/lib/llm";
import { buildChatPrompt } from "@/lib/prompts";
import { getTodayIndex, getWeekStartDate } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, Trash2, User, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: any;
}

interface UserContext {
  doshaType?: string;
  doshaAnalysis?: any;
  goals?: string[];
  diet?: string;
  region?: string;
  todayMeals?: any[];
}

const globalSendLock = { current: false };

const renderMessageContent = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    let htmlLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
    return (
      <div key={i} className={isBullet ? 'ml-2 mb-1' : 'mb-1'} dangerouslySetInnerHTML={{ __html: htmlLine }} />
    );
  });
};

export default function FloatingChatWidget() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const [userContext, setUserContext] = useState<UserContext>({});
  
  const [quickReplies] = useState<string[]>([
    "What should I eat today?",
    "Suggest a healthy recipe",
    "How to improve digestion?",
    "Tips for better sleep",
  ]);
  
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const unsubDosha = subscribeToDoshaResult(user.uid, (data) => {
      setUserContext((prev) => ({ ...prev, doshaType: data?.doshaType, doshaAnalysis: data?.aiAnalysis }));
    });
    const unsubGoals = subscribeToGoals(user.uid, (data) => {
      setUserContext((prev) => ({ ...prev, goals: data?.selectedGoals || [] }));
    });
    const unsubOnboarding = subscribeToOnboarding(user.uid, (data) => {
      if (data) setUserContext((prev) => ({ ...prev, diet: data.diet, region: data.region }));
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = subscribeToMealPlanWeek(user.uid, weekStart, (data) => {
      if (data?.weekPlan && data.weekPlan.days) {
        const todayIdx = getTodayIndex();
        const todayMeals = data.weekPlan.days[todayIdx]?.meals || [];
        setUserContext((prev) => ({ ...prev, todayMeals }));
      }
    });

    const loadMessages = async () => {
      const msgs = await getRecentChatMessages(user.uid, 50);
      if (msgs.length === 0) {
        const welcomeMsg: Message = {
          id: `welcome_${Date.now()}`,
          role: "assistant",
          content: getWelcomeMessage(userContext.doshaType),
        };
        await saveChatMessage(user.uid, welcomeMsg);
        setMessages([welcomeMsg]);
      } else {
        setMessages(msgs);
      }
    };
    loadMessages();

    return () => {
      unsubDosha();
      unsubGoals();
      unsubOnboarding();
      unsubMealPlan();
    };
  }, [user?.uid, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const getWelcomeMessage = (doshaType?: string) => {
    if (doshaType && doshaType !== "Discover") {
      return `Namaste! 🙏 I'm Vaidya AI. How can I assist your ${doshaType} journey today?`;
    }
    return `Namaste! 🙏 I'm Vaidya AI. How can I help you today?`;
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user?.uid) return;
    if (isSendingRef.current || globalSendLock.current) return;

    isSendingRef.current = true;
    globalSendLock.current = true;
    setIsLoading(true);
    setInputText("");

    const userMessageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (processedMessageIds.current.has(userMessageId)) {
      globalSendLock.current = false;
      return;
    }
    processedMessageIds.current.add(userMessageId);

    const userMessage: Message = { id: userMessageId, role: "user", content: text.trim() };

    try {
      await saveChatMessage(user.uid, userMessage);
      setMessages((prev) => [...prev, userMessage]);

      const prompt = buildChatPrompt(text.trim(), messages, userContext);
      const responseText = await callLLM(prompt, 1500);

      const assistantMessage: Message = { id: `assistant_${Date.now()}`, role: "assistant", content: responseText };
      
      await saveChatMessage(user.uid, assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting. Please try again later.",
      };
      await saveChatMessage(user.uid, errorMessage);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isSendingRef.current = false;
        globalSendLock.current = false;
      }, 1000);
    }
  }, [user?.uid, userContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputText.trim()) sendMessage(inputText);
    }
  };

  const handleClearChat = async () => {
    if (!user?.uid) return;
    await clearChatHistory(user.uid);
    const welcomeMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: getWelcomeMessage(userContext.doshaType),
    };
    setMessages([welcomeMsg]);
    await saveChatMessage(user.uid, welcomeMsg);
  };

  // Hide widget if user is on the dedicated chat page
  if (pathname === "/dashboard/chat") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mb-4 w-[360px] h-[500px] max-h-[80vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden border"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.1)' 
            }}
          >
            {/* Header */}
            <div 
              className="p-4 flex items-center justify-between border-b shadow-sm z-10"
              style={{ backgroundColor: colors.card, borderColor: colors.divider }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.gold}20` }}>
                  <span className="text-xl">🌿</span>
                </div>
                <div>
                  <h3 className="font-[800] text-[15px]" style={{ color: colors.text }}>Vaidya AI</h3>
                  <p className="text-[12px]" style={{ color: colors.textMuted }}>Online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  title="Clear Chat"
                >
                  <Trash2 className="w-4 h-4" style={{ color: colors.textMuted }} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-5 h-5" style={{ color: colors.text }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: isDark ? colors.background : '#F9FAFB' }}>
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: isUser ? colors.card : colors.gold }}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" style={{ color: colors.text }} /> : <Bot className="w-3.5 h-3.5" style={{ color: colors.green }} />}
                    </div>
                    <div 
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-[18px] text-[14px] shadow-sm ${isUser ? "rounded-br-sm" : "rounded-bl-sm"}`}
                      style={{ 
                        backgroundColor: isUser ? colors.green : colors.card,
                        color: isUser ? '#FFF' : colors.text,
                        border: isUser ? 'none' : `1px solid ${colors.cardBorder}`
                      }}
                    >
                      {isUser ? msg.content : renderMessageContent(msg.content)}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: colors.gold }}>
                    <Bot className="w-3.5 h-3.5" style={{ color: colors.green }} />
                  </div>
                  <div className="px-3.5 py-3.5 rounded-[18px] rounded-bl-sm shadow-sm flex items-center gap-1.5" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.gold }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.gold, animationDelay: "0.1s" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: colors.gold, animationDelay: "0.2s" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Quick Replies */}
            {quickReplies.length > 0 && !isLoading && (
              <div className="px-4 pb-3 overflow-x-auto" style={{ backgroundColor: isDark ? colors.background : '#F9FAFB', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <div className="flex gap-2">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(reply)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all hover:opacity-80 border"
                      style={{ backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t bg-white dark:bg-[#1E1E1E]" style={{ borderColor: colors.divider, backgroundColor: colors.card }}>
              <div className="flex items-end gap-2 bg-black/5 dark:bg-white/5 rounded-[20px] p-1.5 border" style={{ borderColor: colors.cardBorder }}>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Vaidya AI..."
                  className="flex-1 resize-none outline-none bg-transparent text-[14px] px-3 py-2 min-h-[40px] max-h-[100px]"
                  style={{ color: colors.text }}
                  rows={1}
                />
                <button
                  onClick={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: colors.gold }}
                >
                  <Send className="w-4 h-4" style={{ color: colors.green, marginLeft: '2px' }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: colors.gold }}
      >
        {isOpen ? (
          <X className="w-8 h-8" style={{ color: colors.green }} />
        ) : (
          <MessageCircle className="w-8 h-8" style={{ color: colors.green }} />
        )}
      </button>
    </div>
  );
}
