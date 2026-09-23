"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { clearChatHistory, getRecentChatMessages, saveChatMessage, subscribeToDoshaResult, subscribeToGoals, subscribeToMealPlanWeek, subscribeToOnboarding } from "@/lib/firestore";
import { callLLM } from "@/lib/llm";
import { buildChatPrompt } from "@/lib/prompts";
import { getTodayIndex, getWeekStartDate } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Trash2, User } from "lucide-react";
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
  const cleanText = text.replace(/^(?:\*\*)?Vaidya AI:?(?:\*\*)?\s*\n?/i, '');
  return cleanText.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    let htmlLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
    
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
    if (isBullet) {
       htmlLine = htmlLine.replace(/^[-•]\s*/, '<span style="color: #D4A24E; font-weight: bold; position: absolute; left: 0;">•</span>');
    }
    
    return (
      <div 
        key={i} 
        className={`${isBullet ? 'relative pl-4 mb-1.5 leading-[1.6]' : 'mb-1.5 leading-[1.6]'}`} 
        dangerouslySetInnerHTML={{ __html: htmlLine }} 
      />
    );
  });
};

export default function ChatPage() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const [userContext, setUserContext] = useState<UserContext>({});
  const [quickReplies, setQuickReplies] = useState<string[]>([
    "What should I eat today?",
    "Suggest a healthy recipe",
    "How to improve digestion?",
    "Tips for better sleep",
  ]);

  const processedMessageIds = useRef<Set<string>>(new Set());

  // Load user context and chat history
  useEffect(() => {
    if (!user?.uid) return;

    const unsubDosha = subscribeToDoshaResult(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        doshaType: data?.doshaType,
        doshaAnalysis: data?.aiAnalysis,
      }));
    });

    const unsubGoals = subscribeToGoals(user.uid, (data) => {
      setUserContext((prev) => ({
        ...prev,
        goals: data?.selectedGoals || [],
      }));
    });

    const unsubOnboarding = subscribeToOnboarding(user.uid, (data) => {
      if (data) {
        setUserContext((prev) => ({
          ...prev,
          diet: data.diet,
          region: data.region,
        }));
      }
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = subscribeToMealPlanWeek(user.uid, weekStart, (data) => {
      if (data?.weekPlan && data.weekPlan.days) {
        const todayIdx = getTodayIndex();
        const todayMeals = data.weekPlan.days[todayIdx]?.meals || [];
        setUserContext((prev) => ({ ...prev, todayMeals }));
      }
    });

    // Load chat messages
    let initialLoadComplete = false;
    const loadMessages = async () => {
      const msgs = await getRecentChatMessages(user.uid, 100);
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
      initialLoadComplete = true;
    };
    loadMessages();

    return () => {
      unsubDosha();
      unsubGoals();
      unsubOnboarding();
      unsubMealPlan();
    };
  }, [user?.uid]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWelcomeMessage = (doshaType?: string) => {
    if (doshaType && doshaType !== "Discover") {
      return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I see you have a ${doshaType} constitution. How can I help you today?`;
    }
    return `Namaste! 🙏 I'm Vaidya AI, your personal Ayurvedic wellness companion. I can help you with personalized diet advice, recipes, and wellness tips. Have you taken your Dosha assessment yet?`;
  };

  const sendMessage = useCallback(
    async (text: string) => {
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

      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: text.trim(),
      };

      try {
        await saveChatMessage(user.uid, userMessage);
        setMessages((prev) => [...prev, userMessage]);

        const prompt = buildChatPrompt(text.trim(), messages, userContext);
        const responseText = await callLLM(prompt, 1500);

        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: responseText,
        };

        await saveChatMessage(user.uid, assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. 🙏",
        };
        await saveChatMessage(user.uid, errorMessage);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isSendingRef.current = false;
          globalSendLock.current = false;
        }, 1000);
      }
    },
    [user?.uid, userContext]
  );

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputText.trim()) {
        sendMessage(inputText);
      }
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col max-w-4xl mx-auto w-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: colors.cardBorder }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
          >
            <span className="text-xl">🌿</span>
          </div>
          <div>
            <h1 className="font-black text-lg leading-tight tracking-tight" style={{ color: colors.text }}>
              Vaidya AI
            </h1>
            <p className="text-[13px] font-semibold" style={{ color: colors.textMuted }}>
              Your Ayurvedic wellness companion
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2.5 rounded-full transition-all border shadow-sm hover:scale-105"
          style={{ backgroundColor: colors.surface, borderColor: colors.cardBorder }}
          title="Clear Chat"
        >
          <Trash2 className="w-[18px] h-[18px]" style={{ color: colors.errorText }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide">
        <div className="space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const showAvatar = index === 0 || messages[index - 1]?.role !== message.role;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex items-end gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  {showAvatar ? (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm"
                      style={{ 
                        backgroundColor: isUser ? colors.surface : colors.card,
                        borderColor: colors.cardBorder 
                      }}
                    >
                      {isUser ? (
                        <User className="w-[18px] h-[18px]" style={{ color: colors.textMuted }} />
                      ) : (
                        <span className="text-[18px]">🌿</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-9 shrink-0" />
                  )}

                  <div
                    className={`max-w-[82%] px-5 py-3.5 shadow-sm ${
                      isUser
                        ? "rounded-[24px] rounded-br-sm"
                        : "rounded-[24px] rounded-bl-sm border"
                    }`}
                    style={{
                      backgroundColor: isUser ? colors.green : colors.card,
                      borderColor: isUser ? "transparent" : colors.cardBorder,
                    }}
                  >
                    <div
                      className="text-[15px]"
                      style={{ color: isUser ? "#FFFFFF" : colors.text }}
                    >
                      {isUser ? message.content : renderMessageContent(message.content)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-end gap-3"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border shadow-sm shrink-0"
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
              >
                <span className="text-[18px]">🌿</span>
              </div>
              <div
                className="px-5 py-4 rounded-[24px] rounded-bl-sm border flex items-center gap-1.5 shadow-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
              >
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.gold }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.gold, animationDelay: "0.15s" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.gold, animationDelay: "0.3s" }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* Quick Replies */}
      {quickReplies.length > 0 && !isLoading && (
        <div className="mb-4 overflow-x-auto scrollbar-hide -mx-2 px-2">
          <div className="flex gap-2.5 pb-2">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => sendMessage(reply)}
                className="px-4 py-2.5 rounded-[18px] text-[13px] font-bold whitespace-nowrap border shadow-sm transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                }}
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="pt-2">
        <div
          className="flex items-end gap-3 p-2 pl-5 rounded-[32px] border shadow-sm focus-within:shadow-md transition-shadow"
          style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Vaidya AI anything..."
            className="flex-1 resize-none outline-none bg-transparent text-[15px] py-3.5 font-medium"
            style={{
              color: colors.text,
              minHeight: "52px",
              maxHeight: "120px",
            }}
            rows={1}
          />
          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all mb-0.5 mr-0.5"
            style={{
              backgroundColor: inputText.trim() && !isLoading ? colors.gold : "transparent",
              border: inputText.trim() && !isLoading ? 'none' : `1px solid ${colors.cardBorder}`
            }}
          >
            <Send
              className="w-[20px] h-[20px]"
              style={{
                color: inputText.trim() && !isLoading ? colors.green : colors.textMuted,
                marginLeft: "2px"
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
