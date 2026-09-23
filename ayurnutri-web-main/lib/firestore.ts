import { db } from "@/lib/firebase";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";

// User Profile
export async function upsertProfile(uid: string, data: { fullName: string; email: string; photoURL?: string }) {
  await setDoc(doc(db, "userProfiles", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeToProfile(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "userProfiles", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// Health Goals
export function subscribeToGoals(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "healthGoals", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveGoals(uid: string, selectedGoals: string[]) {
  await setDoc(doc(db, "healthGoals", uid), { selectedGoals, updatedAt: serverTimestamp() }, { merge: true });
}

// Preferences
export function subscribeToPreferences(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "preferences", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function savePreferences(uid: string, prefs: any) {
  await setDoc(doc(db, "preferences", uid), { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
}

// Dosha Results
export function subscribeToDoshaResult(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "doshaResults", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveDoshaResult(uid: string, data: any) {
  await setDoc(doc(db, "doshaResults", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// Onboarding
export function subscribeToOnboarding(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "onboarding", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveOnboarding(uid: string, data: any) {
  await setDoc(doc(db, "onboarding", uid), { ...data, completed: true, updatedAt: serverTimestamp() }, { merge: true });
}

// Meal Plans
export function subscribeToMealPlanWeek(uid: string, weekStart: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "mealPlans", uid, "weeks", weekStart), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function saveMealPlan(uid: string, weekPlan: any, weekStart: string) {
  await setDoc(doc(db, "mealPlans", uid, "weeks", weekStart), {
    weekPlan,
    weekStart,
    generatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getAvailableWeeks(uid: string): Promise<string[]> {
  const q = query(collection(db, "mealPlans", uid, "weeks"), orderBy("weekStart", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

// Checked Meals
export function subscribeToCheckedMeals(uid: string, weekStart: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "mealChecked", uid, "weeks", weekStart), (snap) => {
    callback(snap.exists() ? snap.data()?.checkedMeals || {} : {});
  });
}

export async function saveCheckedMeals(uid: string, checkedMeals: Record<string, boolean>, weekStart: string) {
  await setDoc(doc(db, "mealChecked", uid, "weeks", weekStart), { checkedMeals, updatedAt: serverTimestamp() }, { merge: true });
}

// Favorites
export function subscribeToFavorites(uid: string, callback: (data: any[]) => void) {
  return onSnapshot(doc(db, "favoriteMeals", uid), (snap) => {
    callback(snap.exists() ? snap.data()?.favorites || [] : []);
  });
}

export async function saveFavoriteMeals(uid: string, favorites: any[]) {
  await setDoc(doc(db, "favoriteMeals", uid), { favorites, updatedAt: serverTimestamp() }, { merge: true });
}

// Week Feedback
export async function saveWeekFeedback(uid: string, weekStart: string, feedback: { liked: string[]; disliked: string[] }) {
  await setDoc(doc(db, "weekFeedback", uid, "weeks", weekStart), { ...feedback, createdAt: serverTimestamp() });
}

// Dietitian
export function subscribeToDietitianConnection(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, "patientDietitians", uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function connectDietitian(uid: string, dietitianId: string) {
  await setDoc(doc(db, "patientDietitians", uid), { dietitianId, connectedAt: serverTimestamp() }, { merge: true });
}

export async function getAvailableDietitians() {
  return [
    { id: "dr_suresh", name: "Dr. Suresh Kumar", clinic: "AyurCare Clinic, Mysuru", bamsNumber: "BAMS-KA-2015-8842", experience: "10 Years" },
    { id: "dr_lakshmi", name: "Dr. Lakshmi N", clinic: "Prakriti Wellness, Bengaluru", bamsNumber: "BAMS-KA-2018-9102", experience: "6 Years" },
    { id: "dr_vikram", name: "Dr. Vikram Singh", clinic: "Healing Hands Ayurveda, Delhi", bamsNumber: "BAMS-DL-2012-4011", experience: "14 Years" },
  ];
}

// Chat Messages
export function subscribeToChatMessages(uid: string, callback: (messages: any[]) => void) {
  const q = query(collection(db, "chatMessages", uid, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getRecentChatMessages(uid: string, limit: number = 100): Promise<any[]> {
  const { limit: firestoreLimit } = await import("firebase/firestore");
  const q = query(
    collection(db, "chatMessages", uid, "messages"),
    orderBy("timestamp", "asc"),
    firestoreLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveChatMessage(uid: string, message: any) {
  await setDoc(doc(db, "chatMessages", uid, "messages", message.id), {
    ...message,
    timestamp: serverTimestamp(),
  });
}

export async function clearChatHistory(uid: string) {
  const q = query(collection(db, "chatMessages", uid, "messages"));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "chatMessages", uid, "messages", d.id))));
}

// Recipe Cache
export async function saveRecipeCache(uid: string, input: string, doshaType: string | undefined, recipes: any[]) {
  const docId = `${(doshaType || "general").toLowerCase()}_${input.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60)}`;
  await setDoc(doc(db, "recipeCache", docId), { uid, input, doshaType: doshaType || "general", recipes, cachedAt: serverTimestamp() });
}

export async function getRecipeCache(input: string, doshaType: string | undefined): Promise<any[] | null> {
  const docId = `${(doshaType || "general").toLowerCase()}_${input.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60)}`;
  const snap = await getDoc(doc(db, "recipeCache", docId));
  return snap.exists() ? snap.data()?.recipes || null : null;
}

export async function getRecentRecipeCache(uid: string): Promise<{ input: string, recipes: any[] } | null> {
  try {
      const q = query(
          collection(db, "recipeCache"),
          where("uid", "==", uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
          const docs = snap.docs.map(d => d.data());
          docs.sort((a, b) => {
              const timeA = a.cachedAt?.toMillis?.() || a.cachedAt?.seconds || 0;
              const timeB = b.cachedAt?.toMillis?.() || b.cachedAt?.seconds || 0;
              return timeB - timeA;
          });
          const data = docs[0];
          return {
              input: data.input || "",
              recipes: data.recipes || []
          };
      }
  } catch (err: any) {
      console.warn(`[Firestore] Could not fetch recent recipe cache:`, err?.message);
  }
  return null;
}

// Get dosha result once (non-subscription)
export async function getDoshaResult(uid: string): Promise<any | null> {
  const snap = await getDoc(doc(db, "doshaResults", uid));
  return snap.exists() ? snap.data() : null;
}

// Meal Detail Cache (shared across users)
function mealDetailDocId(mealName: string, doshaType?: string): string {
  const safeMeal = mealName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").slice(0, 50);
  const safeDosha = (doshaType || "general").toLowerCase();
  return `${safeDosha}_${safeMeal}`;
}

export async function getMealDetail(mealName: string, doshaType?: string): Promise<any | null> {
  const docId = mealDetailDocId(mealName, doshaType);
  const snap = await getDoc(doc(db, "mealDetails", docId));
  return snap.exists() ? snap.data()?.detail ?? null : null;
}

export async function saveMealDetail(uid: string, mealName: string, detail: any, doshaType?: string): Promise<void> {
  const docId = mealDetailDocId(mealName, doshaType);
  await setDoc(doc(db, "mealDetails", docId), {
    uid,
    mealName,
    doshaType: doshaType || "general",
    detail,
    cachedAt: serverTimestamp(),
  }, { merge: true });
}
