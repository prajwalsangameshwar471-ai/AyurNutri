// LLM Service with fallback - matches mobile app implementation

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_MODELS = process.env.NEXT_PUBLIC_GROQ_MODELS?.split(",") || [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_MODELS = process.env.NEXT_PUBLIC_OPENROUTER_MODELS?.split(",") || [
  "google/gemini-3.1-pro-preview",
  "arcee-ai/trinity-large-preview:free",
];

// Delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Main function with fallback chain
export async function callLLM(prompt: string, maxTokens: number = 4000): Promise<string> {
  const errors: string[] = [];

  // 1. Try Gemini first
  try {
    console.log("[LLM] Trying Gemini...");
    const result = await callGemini(prompt, maxTokens);
    console.log("[LLM] Gemini succeeded");
    return result;
  } catch (e: any) {
    console.warn("[LLM] Gemini failed:", e.message);
    errors.push(`Gemini: ${e.message}`);
    
    // If rate limited, wait before trying fallback
    if (e.message.includes("429") || e.message.includes("Too Many Requests")) {
      console.log("[LLM] Rate limited, waiting 2s before fallback...");
      await delay(2000);
    }
  }

  // 2. Try Groq models
  if (GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        console.log(`[LLM] Trying Groq model: ${model}...`);
        const result = await callGroq(prompt, model.trim(), maxTokens);
        console.log(`[LLM] Groq ${model} succeeded`);
        return result;
      } catch (e: any) {
        console.warn(`[LLM] Groq ${model} failed:`, e.message);
        errors.push(`Groq ${model}: ${e.message}`);
      }
    }
  }

  // 3. Try OpenRouter models
  if (OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_MODELS) {
      try {
        console.log(`[LLM] Trying OpenRouter model: ${model}...`);
        const result = await callOpenRouter(prompt, model.trim(), maxTokens);
        console.log(`[LLM] OpenRouter ${model} succeeded`);
        return result;
      } catch (e: any) {
        console.warn(`[LLM] OpenRouter ${model} failed:`, e.message);
        errors.push(`OpenRouter ${model}: ${e.message}`);
      }
    }
  }

  // All failed
  throw new Error(`All LLM providers failed:\n${errors.join("\n")}`);
}

// Gemini API
async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

// Groq API
async function callGroq(prompt: string, model: string, maxTokens: number): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Groq API key not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

// OpenRouter API
async function callOpenRouter(prompt: string, model: string, maxTokens: number): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://ayurnutri.com",
      "X-Title": "AyurNutri",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter");
  return text;
}

// JSON extraction helper
export function extractAndParseJSON(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/```([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonText.trim());
  } catch (e) {
    // Try to find JSON object in text
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw e;
  }
}
