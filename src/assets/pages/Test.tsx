import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  getDatabase,
  onValue,
  push,
  query,
  ref,
  runTransaction,
  set,
  update,
  limitToLast,
  get,
  type Database,
} from "firebase/database";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyALYRJwZyYUiOche7behLy-xfi4gHGAZDI",
  authDomain: "gm-battle-arena.firebaseapp.com",
  databaseURL: "https://gm-battle-arena-default-rtdb.firebaseio.com/",
  projectId: "gm-battle-arena",
  storageBucket: "gm-battle-arena.appspot.com",
  messagingSenderId: "445717094791",
  appId: "1:445717094791:web:4f58505f51226e865ef322",
  measurementId: "G-HEJW853DKK",
};

// Types
interface Boss {
  name: string;
  hp: number;
  maxHp: number;
  image: string;
}
interface GMMessage {
  userId: string;
  username: string;
  text: string;
  ts: number;
  damage?: number;
}
interface StreakInfo {
  count: number;
  lastGmAt: number;
}

const DEFAULT_BOSS: Boss = {
  name: "The Early Boss",
  image: "/img/boss.png", // normal image
  hp: 1000000000000,
  maxHp: 1000000000000,
};

// Firebase Singleton
let _app: FirebaseApp | null = null;
let _db: Database | null = null;

function getAppAndDB() {
  if (!_app) _app = initializeApp(firebaseConfig);
  if (!_db) _db = getDatabase(_app);
  return { app: _app, db: _db } as const;
}

// Utils
function usernameFromLocalStorage(): string {
  const key = "gm-battle-username";
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  const rand = Math.floor(1000 + Math.random() * 9000);
  const name = `GM_Warrior_${rand}`;
  localStorage.setItem(key, name);
  return name;
}
function within(hours: number, sinceMs: number, nowMs = Date.now()) {
  return nowMs - sinceMs <= hours * 60 * 60 * 1000;
}
function calcDamage(streak: number) {
  const base = 10;
  const bonus = Math.min(50, streak * 2);
  return base + bonus;
}
function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

// Main App
export default function App() {
  const { db } = useMemo(() => getAppAndDB(), []);
  const [user, setUser] = useState<User | null>(null);
  const [username] = useState(() => usernameFromLocalStorage());

  const [boss, setBoss] = useState(DEFAULT_BOSS);
  const [messages, setMessages] = useState<GMMessage[]>([]);
  const [streak, setStreak] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [isHitting, setIsHitting] = useState(false);

  const cooldownRef = useRef(0);

  // Auth
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch(console.error);
    });
    return () => unsub();
  }, []);

  // Boss state
  useEffect(() => {
    const bossRef = ref(db, "boss");
    const unsub = onValue(bossRef, (snap) => {
      const data = snap.val() as Boss | null;
      if (!data) {
        set(bossRef, DEFAULT_BOSS);
        setBoss(DEFAULT_BOSS);
      } else {
        setBoss(data);
      }
    });
    return () => unsub();
  }, [db]);

  // function formatTime(ts: number) {
  //   const d = new Date(ts);
  //   return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  // }

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function timeAgo(ts: number) {
    const diff = Math.floor((now - ts) / 1000); // selisih dalam detik
    if (diff < 60) return `${diff} sec ago`;
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min} min ago`;
    const h = Math.floor(min / 60);
    return `${h} h ago`;
  }

  // Messages
  useEffect(() => {
    const messagesRef = query(ref(db, "messages"), limitToLast(50));
    const unsub = onValue(messagesRef, (snap) => {
      const arr: GMMessage[] = [];
      snap.forEach((child) => {
        const v = child.val();
        if (v) arr.push(v);
      });
      arr.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

      setMessages(arr);
    });
    return () => unsub();
  }, [db]);

  // Streak
  useEffect(() => {
    if (!user) return;
    const sRef = ref(db, `streaks/${user.uid}`);
    const unsub = onValue(sRef, (snap) => {
      const v = (snap.val() as StreakInfo | null) ?? { count: 0, lastGmAt: 0 };
      setStreak(v.count || 0);
    });
    return () => unsub();
  }, [db, user]);

  // Cooldown
  useEffect(() => {
    const id = setInterval(() => {
      cooldownRef.current = Math.max(0, cooldownRef.current - 1);
      setCooldown(cooldownRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Handle GM
  const handleGM = async () => {
    if (!user || cooldownRef.current > 0) return;

    const now = Date.now();
    const sRef = ref(db, `streaks/${user.uid}`);
    let newCount = 1;

    await runTransaction(sRef, (current: StreakInfo | null) => {
      if (current && current.lastGmAt && within(48, current.lastGmAt, now)) {
        newCount = (current.count || 0) + 1;
      } else {
        newCount = 1;
      }
      return { count: newCount, lastGmAt: now } as StreakInfo;
    });

    const damage = calcDamage(newCount);

    await runTransaction(ref(db, "boss"), (current: Boss | null) => {
      const cur = current ?? DEFAULT_BOSS;
      return { ...cur, hp: Math.max(0, cur.hp - damage) };
    });

    await push(ref(db, "messages"), {
      userId: user.uid,
      username,
      text: "gm",
      ts: Date.now(),
      damage,
    });

    setIsHitting(true);
    setTimeout(() => setIsHitting(false), 800); // agak lama biar efek tangisan kelihatan
    cooldownRef.current = 2;
    setCooldown(2);

    setTimeout(async () => {
      const bossSnap = await get(ref(db, "boss"));
      const v = bossSnap.val() as Boss | null;
      if (v && v.hp === 0) {
        const nextMax = Math.round((v.maxHp || DEFAULT_BOSS.maxHp) * 1.25);
        await update(ref(db, "boss"), {
          name: `ETH OS BOSS v${Math.floor(Math.random() * 100)}`,
          hp: nextMax,
          maxHp: nextMax,
        });
        await push(ref(db, "messages"), {
          userId: "system",
          username: "SYSTEM",
          text: `Boss respawned with ${nextMax} HP!`,
          ts: Date.now(),
        });
      }
    }, 800);
  };

  const hpPercent = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));

  // Gambar tangisan kesakitan
  const cryingImage = "/img/crying.png"; // ganti path sesuai file kamu

  return (
    <div className="min-h-screen bg-ethos text-gray-100 flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            GM Battle Arena
          </h1>
        </div>
        <div className="text-sm text-white font-bold">
          Signed in as{" "}
          <span className="font-semibold text-emerald-400">{username}</span>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Arena */}
        <div className="bg-[#a78bc4] rounded-2xl p-6 border border-gray-700 shadow-lg">
          <div className="flex flex-col items-center">
            {/* Boss Avatar */}
            <div className="relative">
              <motion.div
                className="w-56 h-56 md:w-64 md:h-64 rounded-full border-4 border-red-500 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-2xl overflow-hidden"
                animate={
                  isHitting ? { scale: [1, 1.06, 1], rotate: [0, -3, 0] } : {}
                }
                transition={{ duration: 0.4 }}
              >
                <motion.img
                  key={isHitting ? "crying" : "normal"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={
                    isHitting ? cryingImage : boss.image || "/boss-default.png"
                  }
                  alt={boss.name}
                  className="w-full h-full object-cover"
                />
                <AnimatePresence>
                  {isHitting && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-4 -right-6 text-red-400 font-extrabold text-3xl"
                    >
                      😭💥
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* HP Bar */}
            <div className="w-full max-w-xl mt-6">
              <div className="flex justify-between mb-1 text-sm text-red-900">
                <span>HP</span>
                <span className="text-red-900">
                  {formatNumber(boss.hp)} / {formatNumber(boss.maxHp)}
                </span>
              </div>
              <div className="h-4 w-full bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 to-red-400"
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={handleGM}
                disabled={cooldown > 0}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  cooldown > 0 ? `Cooldown ${cooldown}s` : "Say GM to attack!"
                }
              >
                {cooldown > 0 ? `Cooldown ${cooldown}s` : "Say GM!"}
              </button>
              <div className="text-sm text-gray-200">
                Streak:{" "}
                <span className="font-semibold text-emerald-400">{streak}</span>{" "}
                • Damage next hit:{" "}
                <span className="font-semibold text-red-400">
                  {calcDamage(streak || 0)}
                </span>
              </div>
              <p className="text-xs text-white">
                Streak increases if you GM at least once every ≤ 48 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Chat / Feed */}
        <div className="bg-[#a78bc4] rounded-2xl p-4 border border-gray-700 shadow-lg flex flex-col h-[520px]">
          <h2 className="text-lg font-semibold text-white mb-2">Global Feed</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {messages.map((m, i) => (
              <div key={i} className="text-sm flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-semibold shrink-0 ">
                    {m.username}
                  </span>
                  <span className="text-gray-600 text-xs">{timeAgo(m.ts)}</span>
                </div>
                <div className="text-gray-200">
                  {m.text}
                  {m.damage ? (
                    <span className="ml-2 text-red-500">- {m.damage} HP</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="mt-8 text-xs text-gray-500">
        Create by @FrostHiro94138 for @Ethereum_OS
      </footer>
    </div>
  );
}
