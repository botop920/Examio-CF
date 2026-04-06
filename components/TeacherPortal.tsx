import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { SecureStorage } from "../lib/security";
import {
  Search,
  Loader2,
  BookOpen,
  Clock,
  Hexagon,
  Calendar,
  Trophy,
  Radio,
  ChevronRight,
  BarChart2,
  Hourglass,
  LogOut,
  TrendingUp,
  CheckCircle2,
  Activity,
  Sun,
  Moon,
  AlertOctagon,
  RefreshCw,
  Mail,
  Home,
  AlertCircle,
  X,
  Bell,
  BookX,
  BrainCircuit,
  Star,
  Target,
  Zap,
  Filter,
  ChevronDown,
  Lock,
  Megaphone,
  Flame,
  Play,
  HelpCircle,
  MessageCircle,
  User,
  Atom,
  FlaskConical,
  Grid3X3,
  FileText,
  XCircle,
  Bot,
} from "lucide-react";
import { LatexText } from "./LatexText";
import { DoubtView } from "./DoubtView";
import toast from "react-hot-toast";

interface TeacherPortalProps {
  teacherId: string;
  batchToken?: string;
  theme: string;
  toggleTheme: () => void;
}

// --- SKELETON COMPONENT ---
const PortalSkeleton = () => (
  <div className="min-h-screen bg-[#F8F9FA] dark:bg-black font-sans pb-24">
    {/* Header Skeleton */}
    <div className="sticky top-0 z-30 bg-[#F8F9FA]/80 dark:bg-black/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-white/5">
      <div className="space-y-1.5">
        <div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse"></div>
        <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse"></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse"></div>
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse"></div>
      </div>
    </div>

    <div className="max-w-lg mx-auto px-4 pt-4 space-y-8">
      {/* Search Skeleton */}
      <div className="h-12 w-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-transparent shadow-sm flex items-center px-4 relative overflow-hidden">
        <div className="w-full h-4 bg-gray-100 dark:bg-white/5 rounded-md animate-pulse"></div>
      </div>

      {/* Live Exams Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse px-1"></div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-[100px] bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 p-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/50 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
              <div className="flex justify-between items-start">
                <div className="space-y-3 w-3/4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded-md"></div>
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse px-1"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-gray-100 dark:border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/50 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
              <div className="flex justify-between mb-3">
                <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded-md"></div>
              </div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom Nav Skeleton */}
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 h-16 pb-safe z-50">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 w-full animate-pulse"
          >
            <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-white/10"></div>
            <div className="w-10 h-2 rounded-md bg-gray-200 dark:bg-white/10"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- SUB-COMPONENTS FOR VISUALS ---

const PerformanceGraph = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.percentage));

  return (
    <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2">
      {data
        .slice(0, 7)
        .reverse()
        .map((item, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-2 group"
          >
            <div className="relative w-full flex justify-center">
              <div
                className="w-full max-w-[20px] bg-gradient-to-t from-primary/50 to-primary rounded-t-full transition-all duration-1000 group-hover:from-purple-500 group-hover:to-indigo-500"
                style={{
                  height: `${(item.percentage / (maxVal || 100)) * 120}px`,
                  minHeight: "4px",
                }}
              ></div>
              <div className="absolute -top-8 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {item.percentage}%
              </div>
            </div>
            <p className="text-[9px] text-gray-400 font-bold uppercase truncate w-full text-center">
              {item.date}
            </p>
          </div>
        ))}
    </div>
  );
};

// NEW: Upcoming Card with Live Countdown
const UpcomingExamCard: React.FC<{ exam: any }> = ({ exam }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(exam.start_time).getTime();
      const distance = start - now;

      if (distance < 0) {
        setTimeLeft("Starting...");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
      else setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exam.start_time]);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-0.5 rounded uppercase tracking-wider">
          {exam.subject}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
          <Clock size={12} /> {timeLeft}
        </div>
      </div>
      <h3 className="font-bold text-sm text-[#1D1D1F] dark:text-white leading-tight">
        {exam.title}
      </h3>
      <p className="text-[10px] text-gray-400 mt-1">
        {new Date(exam.start_time).toLocaleString()}
      </p>
    </div>
  );
};

// UPDATED: Compact Premium Card
const PremiumExamCard = ({ exam, submission, onClick }: any) => {
  const isTaken = !!submission;
  const pct =
    isTaken && submission.total_marks > 0
      ? (submission.obtained_marks / submission.total_marks) * 100
      : 0;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 active:scale-95 cursor-pointer group border
            ${
              isTaken
                ? "bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5"
                : "bg-gradient-to-br from-white to-gray-50 dark:from-[#1C1C1E] dark:to-[#111] border-transparent hover:border-primary/30 shadow-sm hover:shadow-md"
            }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {isTaken ? (
              <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 size={10} /> Taken
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {exam.subject}
              </span>
            )}
            {isTaken && submission.rank > 0 && (
              <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Trophy size={10} /> #{submission.rank}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white leading-snug line-clamp-2 pr-2">
            {exam.title}
          </h3>

          {!isTaken && (
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {exam.duration_minutes}m
              </span>
              <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                Start <ChevronRight size={12} />
              </span>
            </div>
          )}
        </div>

        {isTaken ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100 dark:text-white/5"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className={`${pct >= 80 ? "text-green-500" : pct >= 50 ? "text-yellow-500" : "text-red-500"} transition-all duration-1000 ease-out`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${pct}, 100`}
                />
              </svg>
              <span className="absolute text-[9px] font-bold">
                {pct.toFixed(0)}%
              </span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              {Number(submission.obtained_marks).toFixed(1)} /{" "}
              {submission.total_marks}
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
            <BookOpen size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  teacherId: propTeacherId,
  batchToken,
  theme,
  toggleTheme,
}) => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);

  // Mobile App Navigation State
  const [activeView, setActiveView] = useState<
    "home" | "analytics" | "mistakes" | "profile" | "leaderboard" | "upcoming" | "past" | "doubt"
  >("home");
  const [now, setNow] = useState(new Date());

  // Context State
  const [contextTeacherId, setContextTeacherId] = useState<string | null>(
    propTeacherId || null,
  );
  const [contextBatchName, setContextBatchName] = useState<string>("");

  // Student Specific State
  const [studentIdentity, setStudentIdentity] = useState<{
    name: string;
    roll: string;
  } | null>(null);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Mistakes Data
  const [allMistakes, setAllMistakes] = useState<any[]>([]); // Flat list of all mistakes
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState("All");
  const [mistakeLimit, setMistakeLimit] = useState(5);
  const [loadingMistakes, setLoadingMistakes] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // Analytics Stats
  const [analytics, setAnalytics] = useState<any>({
    takenCount: 0,
    totalConducted: 0,
    avgPercentage: 0,
    totalPossible: 0,
    totalObtained: 0,
    graphData: [],
  });

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (contextTeacherId) {
      fetchAnnouncements();
    }
  }, [contextTeacherId]);

  const fetchAnnouncements = async () => {
    if (!contextTeacherId) return;
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("teacher_id", contextTeacherId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
      // Calculate unread
      const readIds = JSON.parse(
        localStorage.getItem(`read_announcements_${contextTeacherId}`) || "[]",
      );
      const unread = data.filter((a: any) => !readIds.includes(a.id)).length;
      setUnreadCount(unread);
    }
  };

  const handleOpenAnnouncements = () => {
    setShowAnnouncements(true);
    setUnreadCount(0);
    const ids = announcements.map((a: any) => a.id);
    localStorage.setItem(
      `read_announcements_${contextTeacherId}`,
      JSON.stringify(ids),
    );
  };

  useEffect(() => {
    const embedParam =
      new URLSearchParams(window.location.search).get("embed") === "true";
    setIsEmbed(embedParam);

    // Load Student Identity
    const saved = SecureStorage.getItem("exam_student_identity");
    if (saved && saved.name && saved.roll) {
      setStudentIdentity(saved);
    }

    initializePortal();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [propTeacherId, batchToken]);

  const initializePortal = async () => {
    setLoading(true);
    setInitError(null);
    let targetTeacherId = propTeacherId;
    let targetBatchName = "";

    try {
      if (batchToken) {
        const { data: batchInfo, error: batchError } = await supabase
          .from("batches")
          .select("teacher_id, name, allowed_domain, domain_lock_status")
          .eq("public_token", batchToken)
          .single();

        if (batchError || !batchInfo) {
          setInitError("Invalid or expired batch link.");
          setLoading(false);
          return;
        }

        // --- SECURITY: DOMAIN VERIFICATION RESTORED ---
        if (
          batchInfo.allowed_domain &&
          batchInfo.domain_lock_status === "approved"
        ) {
          const cleanAllowed = batchInfo.allowed_domain
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "");

          // 1. Check if running in Iframe (Critical for "Embed Only")
          const isInIframe = window.self !== window.top;

          const isLocalhost =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

          console.log("Domain Verification:", {
            allowed: cleanAllowed,
            isInIframe,
            isLocalhost,
            referrer: document.referrer,
            currentHost: window.location.hostname,
          });

          if (!isLocalhost) {
            // If direct access (not in iframe), BLOCK IT
            if (!isInIframe) {
              setInitError(
                "Access Denied: This exam is domain-locked and must be embedded.",
              );
              setLoading(false);
              return;
            }

            // 2. Referrer Check (If available)
            const referrer = document.referrer;
            if (referrer) {
              try {
                const refHost = new URL(referrer).hostname.toLowerCase();
                if (
                  !refHost.includes(cleanAllowed) &&
                  !cleanAllowed.includes(refHost)
                ) {
                  console.error(
                    `Domain Mismatch: Referrer (${refHost}) does not match Allowed (${cleanAllowed})`,
                  );
                  setInitError(
                    `Access Denied: Embedding on '${refHost}' is not allowed.`,
                  );
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error("Referrer check failed:", e);
              }
            }
          }
        }
        // ---------------------------------------------

        targetTeacherId = batchInfo.teacher_id;
        targetBatchName = batchInfo.name;
        setContextTeacherId(targetTeacherId);
        setContextBatchName(targetBatchName);
      } else {
        setContextTeacherId(propTeacherId);
      }

      // PWA Persistence: Save Context
      if (targetTeacherId) {
        SecureStorage.setItem("last_portal_session", {
          type: batchToken ? "batch" : "teacher",
          id: batchToken ? batchToken : targetTeacherId,
        });
      }

      await fetchExamsDirect(targetTeacherId, targetBatchName);
    } catch (err: any) {
      setInitError(err.message || "Failed to load portal.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExamsDirect = async (tId: string, bName?: string) => {
    if (!tId) return;
    let query = supabase
      .from("exams")
      .select("*")
      .eq("teacher_id", tId)
      .in("status", ["published", "completed", "draft"])
      .order("start_time", { ascending: true });
    if (bName) query = query.in("batch", [bName, "All"]);
    const { data, error } = await query;
    if (!error && data)
      setExams(
        data.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
  };

  useEffect(() => {
    if (studentIdentity && contextTeacherId) {
      fetchStudentHistory();
      fetchMistakes();
    }
  }, [studentIdentity, contextTeacherId]);

  const fetchStudentHistory = async () => {
    if (!contextTeacherId || !studentIdentity) return;
    setLoadingHistory(true);
    const { data, error } = await supabase.rpc("get_student_history_v2", {
      p_teacher_id: contextTeacherId,
      p_student_roll: studentIdentity.roll,
    });

    if (data) {
      const formatted = data.map((d: any) => ({
        exam_id: d.exam_id,
        exam_title: d.exam_title,
        exam_date: d.exam_date,
        total_marks: d.total_marks,
        obtained_marks: d.obtained_marks,
        rank: d.rank,
        total_participants: d.total_participants,
        status: d.status,
      }));
      setMySubmissions(formatted);
      calculateAnalytics(formatted);
    }
    setLoadingHistory(false);
  };

  const fetchMistakes = async () => {
    if (!contextTeacherId || !studentIdentity) return;
    setLoadingMistakes(true);

    try {
      const response = await fetch(
        `/api/get-mistakes?teacher_id=${contextTeacherId}&student_roll=${studentIdentity.roll}`,
      );
      if (!response.ok) throw new Error("Failed to fetch mistakes");
      const data = await response.json();

      // Set flattened list directly
      setAllMistakes(data || []);
    } catch (err) {
      console.error("Mistakes fetch error:", err);
    } finally {
      setLoadingMistakes(false);
    }
  };

  // Derived Mistakes Data
  const mistakeSubjects = useMemo(() => {
    const subjs = new Set(allMistakes.map((m) => m.subject || "General"));
    return ["All", ...Array.from(subjs).filter((s) => s !== "All")];
  }, [allMistakes]);

  const filteredMistakes = useMemo(() => {
    if (mistakeSubjectFilter === "All") return allMistakes;
    return allMistakes.filter(
      (m) => (m.subject || "General") === mistakeSubjectFilter,
    );
  }, [allMistakes, mistakeSubjectFilter]);

  const visibleMistakes = useMemo(() => {
    return filteredMistakes.slice(0, mistakeLimit);
  }, [filteredMistakes, mistakeLimit]);

  const lastMistakeElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMistakes) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          visibleMistakes.length < filteredMistakes.length
        ) {
          setMistakeLimit((prev) => prev + 5);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMistakes, visibleMistakes.length, filteredMistakes.length],
  );

  // Reset pagination when filter changes
  useEffect(() => {
    setMistakeLimit(5);
  }, [mistakeSubjectFilter]);

  const calculateAnalytics = (submissions: any[]) => {
    const takenCount = submissions.length;
    const totalConducted = exams.filter(
      (e) =>
        e.status === "published" ||
        e.status === "completed" ||
        submissions.find((s) => s.exam_id === e.id),
    ).length;
    const totalPossible = submissions.reduce(
      (acc, curr) => acc + (Number(curr.total_marks) || 0),
      0,
    );
    const totalObtained = submissions.reduce(
      (acc, curr) => acc + (Number(curr.obtained_marks) || 0),
      0,
    );
    const avgPercentage =
      totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

    const graphData = submissions.slice(0, 10).map((s) => ({
      date: new Date(s.exam_date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      }),
      percentage:
        s.total_marks > 0
          ? Math.round((s.obtained_marks / s.total_marks) * 100)
          : 0,
    }));

    setAnalytics({
      takenCount,
      totalConducted,
      avgPercentage,
      totalPossible,
      totalObtained,
      graphData,
    });
  };

  const handleLogout = () => {
    SecureStorage.removeItem("exam_student_identity");
    // Do NOT clear 'last_portal_session' so user stays on the login screen of this portal
    setStudentIdentity(null);
    setMySubmissions([]);
    setAllMistakes([]);
    setActiveView("home");
    toast.success("Logged out successfully");
  };

  const { live, upcoming, past } = useMemo(() => {
    const liveExams: any[] = [];
    const upcomingExams: any[] = [];
    const pastExams: any[] = [];
    
    const filtered = exams.filter(e => 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.subject && e.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.forEach((exam) => {
      const start = exam.start_time ? new Date(exam.start_time) : null;
      if (start && start > now) {
        upcomingExams.push(exam);
        return;
      }
      if (exam.status === "draft") return;
      if (exam.status === "completed" || (exam.end_time && new Date(exam.end_time) < now)) {
          pastExams.push(exam);
          return;
      }
      liveExams.push(exam);
    });
    return { live: liveExams, upcoming: upcomingExams, past: pastExams };
  }, [exams, now, searchTerm]);

  const fetchGlobalLeaderboard = async () => {
    if (!exams.length) return;
    setLoadingLeaderboard(true);
    
    try {
      // Get all exam IDs
      const examIds = exams.map(e => e.id);
      
      // Fetch all submissions for these exams
      const { data, error } = await supabase
        .from('student_submissions')
        .select('student_name, student_roll, obtained_marks')
        .in('exam_id', examIds);

      if (data) {
        // Aggregate scores by student roll
        const studentStats: Record<string, { name: string, roll: string, totalScore: number, examsTaken: number }> = {};
        
        data.forEach((sub: any) => {
          const roll = sub.student_roll;
          if (!studentStats[roll]) {
            studentStats[roll] = { name: sub.student_name, roll: sub.student_roll, totalScore: 0, examsTaken: 0 };
          }
          studentStats[roll].totalScore += (Number(sub.obtained_marks) || 0);
          studentStats[roll].examsTaken += 1;
        });

        // Convert to array and sort
        const leaderboard = Object.values(studentStats)
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 50); // Top 50
        
        setLeaderboardData(leaderboard);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeView === 'leaderboard') {
      fetchGlobalLeaderboard();
    }
  }, [activeView, exams]);

  const handleExamClick = (examId: string, asLeaderboard = false) => {
    let url = `/?exam_id=${examId}${isEmbed ? "&embed=true" : ""}`;
    if (asLeaderboard) url += "&leaderboard=true";
    window.location.href = url;
  };

  // Use Premium Skeleton Loader
  if (loading) return <PortalSkeleton />;

  if (initError)
    return (
      <div className="h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl text-center shadow-lg max-w-md w-full border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <Lock size={32} />
          </div>
          <h3 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            {initError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 w-full bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 px-6 py-3 flex justify-between items-center pb-safe z-50 max-w-lg mx-auto">
      <div
        onClick={() => setActiveView("home")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeView === "home" ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
      >
        <div className="relative">
          {activeView === "home" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"></div>
          )}
          <Home className="w-6 h-6 text-gray-900 dark:text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          হোম
        </span>
      </div>
      <div
        onClick={() => setActiveView("mistakes")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeView === "mistakes" ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
      >
        <div className="relative">
          {activeView === "mistakes" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"></div>
          )}
          <XCircle className="w-6 h-6 text-gray-900 dark:text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          মিসটেকস
        </span>
      </div>
      <div
        onClick={() => setActiveView("analytics")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeView === "analytics" ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
      >
        <div className="relative">
          {activeView === "analytics" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"></div>
          )}
          <BarChart2 className="w-6 h-6 text-gray-900 dark:text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          অ্যানালিটিক্স
        </span>
      </div>
      <div
        onClick={() => setActiveView("doubt")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeView === "doubt" ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
      >
        <div className="relative">
          {activeView === "doubt" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"></div>
          )}
          <Bot className="w-6 h-6 text-gray-900 dark:text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          ডাউট
        </span>
      </div>
      <div
        onClick={() => setActiveView("profile")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeView === "profile" ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
      >
        <div className="relative">
          {activeView === "profile" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"></div>
          )}
          <User className="w-6 h-6 text-gray-900 dark:text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          প্রোফাইল
        </span>
      </div>
    </nav>
  );

  if (activeView === "doubt") {
    return (
      <div className="fixed inset-0 bg-[#F8F9FA] dark:bg-black z-[100] flex flex-col">
        <div className="flex-1 w-full h-full">
          <DoubtView onBack={() => setActiveView('home')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-black font-sans text-[#1D1D1F] dark:text-white pb-24 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-[#F8F9FA] dark:bg-black border-b border-gray-200/50 dark:border-white/5 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${studentIdentity?.name || "Student"}`}
              alt="Profile"
              className="w-12 h-12 rounded-full bg-yellow-100 border-2 border-white dark:border-[#1C1C1E] shadow-sm"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1C1C1E] rounded-full"></div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {studentIdentity?.name || "শিক্ষার্থী"}
            </h2>
            <p className="text-sm text-gray-500">
              {studentIdentity?.roll
                ? `Roll: ${studentIdentity.roll}`
                : "অ্যাডভান্সড লার্নার"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showSearch ? (
            <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-full px-3 py-1.5 animate-in fade-in slide-in-from-right-5">
              <Search size={14} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search exams..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-32 text-gray-900 dark:text-white placeholder-gray-500"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchTerm(''); }} className="ml-1 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-white/20"
            >
              <Search size={18} />
            </button>
          )}
          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {analytics.takenCount || 0}
            </span>
          </div>
          <div
            className="relative p-2 cursor-pointer"
            onClick={handleOpenAnnouncements}
          >
            <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1C1C1E]"></div>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* --- HOME VIEW --- */}
        {activeView === "home" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Live Banner */}
            {live.length > 0 && (
              <div
                onClick={() => handleExamClick(live[0].id)}
                className="mt-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-50 via-white to-blue-50 dark:from-pink-900/20 dark:via-[#1C1C1E] dark:to-blue-900/20 border border-gray-100 dark:border-white/5 p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 shadow-sm flex items-center justify-center text-red-500">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-red-500">
                        লাইভ চলছে
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                      {live[0].title}
                    </h3>
                  </div>
                </div>
                <button className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md shadow-red-200 dark:shadow-none active:scale-95 transition-transform shrink-0">
                  জয়েন
                </button>
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-5 gap-2 mt-6">
              <div className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center shadow-md shadow-red-200 dark:shadow-none group-active:scale-95 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                  লাইভ
                </span>
              </div>
              <div onClick={() => setActiveView('upcoming')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-none group-active:scale-95 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                  রুটিন
                </span>
              </div>
              <div onClick={() => setActiveView('past')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-[#F97316] text-white flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-none group-active:scale-95 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                  অতীত
                </span>
              </div>
              <div onClick={() => setActiveView('leaderboard')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-[#14B8A6] text-white flex items-center justify-center shadow-md shadow-teal-200 dark:shadow-none group-active:scale-95 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                  র‍্যাংক
                </span>
              </div>
              <div onClick={() => setActiveView('doubt')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none group-active:scale-95 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                  ডাউট
                </span>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  চলমান পরীক্ষাসমূহ
                </h3>
                <button className="text-sm font-semibold text-gray-500 flex items-center hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
                  সব দেখুন <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>

              <div className="space-y-3">
                {upcoming.length === 0 && live.length <= 1 && (
                  <div className="text-center py-10 opacity-50">
                    <Calendar
                      className="mx-auto mb-2 text-gray-300"
                      size={32}
                    />
                    <p className="text-xs">No upcoming tasks</p>
                  </div>
                )}

                {/* Map over remaining live exams and upcoming exams */}
                {[...live.slice(1), ...upcoming].map((exam, idx) => {
                  // Determine icon and color based on subject or random
                  const colors = [
                    {
                      bg: "bg-blue-50 dark:bg-blue-900/20",
                      text: "text-blue-500",
                      icon: <Atom className="w-5 h-5" />,
                      hover: "hover:border-blue-200",
                    },
                    {
                      bg: "bg-green-50 dark:bg-green-900/20",
                      text: "text-green-500",
                      icon: <FlaskConical className="w-5 h-5" />,
                      hover: "hover:border-green-200",
                    },
                    {
                      bg: "bg-gray-50 dark:bg-gray-800",
                      text: "text-gray-500",
                      icon: <Grid3X3 className="w-5 h-5" />,
                      hover: "hover:border-gray-300",
                    },
                    {
                      bg: "bg-orange-50 dark:bg-orange-900/20",
                      text: "text-orange-500",
                      icon: <FileText className="w-5 h-5" />,
                      hover: "hover:border-orange-200",
                    },
                  ];
                  const colorTheme = colors[idx % colors.length];

                  const start = new Date(exam.start_time);
                  const end = exam.end_time ? new Date(exam.end_time) : null;
                  let timeLabel: React.ReactNode = "";

                  if (end && now >= start && now < end) {
                      const diff = end.getTime() - now.getTime();
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                      timeLabel = (
                          <span className="text-orange-500 font-bold animate-pulse">
                              শেষ হবে: {hours}h {minutes}m {seconds}s
                          </span>
                      );
                  } else if (start && !isNaN(start.getTime()) && start.getFullYear() > 1970) {
                      if (start.toDateString() === new Date().toDateString()) {
                        timeLabel = `আজ, ${start.toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}`;
                      } else {
                        timeLabel = start.toLocaleDateString("bn-BD", {
                          day: "numeric",
                          month: "long",
                        });
                      }
                  } else {
                      timeLabel = "";
                  }

                  return (
                    <div
                      key={exam.id}
                      onClick={() => handleExamClick(exam.id)}
                      className={`bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer ${colorTheme.hover} hover:shadow-md transition-all group`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full ${colorTheme.bg} flex items-center justify-center ${colorTheme.text} mt-1 shrink-0`}
                        >
                          {colorTheme.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">
                              {exam.subject || "General"}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                NEW
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-[15px] mb-1.5 line-clamp-1">
                            {exam.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{exam.duration_minutes} মিনিট</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              <span>{exam.question_count || exam.total_marks || 0} প্রশ্ন</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-gray-400">
                          {timeLabel}
                        </span>
                        <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-white/10 group-hover:text-gray-600 dark:group-hover:text-white transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- PAST EXAMS VIEW --- */}
        {activeView === "past" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h2 className="text-xl font-bold dark:text-white">Past Exams</h2>
            </div>
            {past.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Clock className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="text-xs">No past exams found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {past.map((exam, idx) => {
                        // Check if student has taken this exam
                        const submission = mySubmissions.find(s => s.exam_id === exam.id);
                        
                        // Use same color logic as tasks section
                        const colors = [
                            {
                              bg: "bg-blue-50 dark:bg-blue-900/20",
                              text: "text-blue-500",
                              icon: <Atom className="w-5 h-5" />,
                              hover: "hover:border-blue-200",
                            },
                            {
                              bg: "bg-green-50 dark:bg-green-900/20",
                              text: "text-green-500",
                              icon: <FlaskConical className="w-5 h-5" />,
                              hover: "hover:border-green-200",
                            },
                            {
                              bg: "bg-gray-50 dark:bg-gray-800",
                              text: "text-gray-500",
                              icon: <Grid3X3 className="w-5 h-5" />,
                              hover: "hover:border-gray-300",
                            },
                            {
                              bg: "bg-orange-50 dark:bg-orange-900/20",
                              text: "text-orange-500",
                              icon: <FileText className="w-5 h-5" />,
                              hover: "hover:border-orange-200",
                            },
                        ];
                        const colorTheme = colors[idx % colors.length];

                        const start = new Date(exam.start_time);
                        let timeLabel = "";
                        if (start.toDateString() === new Date().toDateString()) {
                            timeLabel = `আজ, ${start.toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}`;
                        } else {
                            timeLabel = start.toLocaleDateString("bn-BD", {
                            day: "numeric",
                            month: "long",
                            });
                        }

                        return (
                            <div
                              key={exam.id}
                              onClick={() => handleExamClick(exam.id)}
                              className={`bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer ${colorTheme.hover} hover:shadow-md transition-all group`}
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  className={`w-10 h-10 rounded-full ${colorTheme.bg} flex items-center justify-center ${colorTheme.text} mt-1 shrink-0`}
                                >
                                  {colorTheme.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-500">
                                      {exam.subject || "General"}
                                    </span>
                                    {submission && (
                                      <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Taken
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-gray-900 dark:text-white text-[15px] mb-1.5 line-clamp-1">
                                    {exam.title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{exam.duration_minutes} মিনিট</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>{exam.question_count || exam.total_marks || 0} প্রশ্ন</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-[11px] font-semibold text-gray-400">
                                  {timeLabel}
                                </span>
                                {submission ? (
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-gray-900 dark:text-white">
                                            {Number(submission.obtained_marks).toFixed(1)}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            / {submission.total_marks}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-white/10 group-hover:text-gray-600 dark:group-hover:text-white transition-colors">
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                )}
                              </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        )}

        {/* --- UPCOMING VIEW --- */}
        {activeView === "upcoming" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h2 className="text-xl font-bold dark:text-white">Upcoming Exams</h2>
            </div>
            {upcoming.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Calendar className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="text-xs">No upcoming exams found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {upcoming.map(exam => (
                        <UpcomingExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            )}
          </div>
        )}

        {/* --- LEADERBOARD VIEW --- */}
        {activeView === "leaderboard" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h2 className="text-xl font-bold dark:text-white">Leaderboard</h2>
            </div>
            
            {!studentIdentity ? (
                <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm">
                    <Lock className="mx-auto mb-4 text-gray-300" size={48} />
                    <h3 className="text-lg font-bold mb-2">Login Required</h3>
                    <p className="text-gray-500 text-sm mb-6">Please join an exam to verify your identity and see the leaderboard.</p>
                    <button onClick={() => setActiveView('home')} className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm">
                        Go Home
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 text-center py-12">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2">Top 20 Leaderboard</h3>
                    <p className="text-gray-500 text-sm mb-6">Global ranking based on total points</p>
                    
                    {/* Leaderboard List */}
                    {loadingLeaderboard ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="animate-spin text-primary" />
                        </div>
                    ) : leaderboardData.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <p>No data available yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaderboardData.map((student, i) => (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${student.roll === studentIdentity.roll ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30' : 'bg-gray-50 dark:bg-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'}`}>
                                            #{i + 1}
                                        </div>
                                        <div className="w-8 h-8 bg-white dark:bg-white/10 rounded-full flex items-center justify-center font-bold text-xs text-primary">
                                            {student.name?.[0]}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm text-[#1D1D1F] dark:text-white line-clamp-1">{student.name}</p>
                                            <p className="text-[10px] text-gray-400">Roll: {student.roll}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-sm block">{Number(student.totalScore).toFixed(0)}</span>
                                        <span className="text-[10px] text-gray-400">Points</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Your Rank</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs">
                                    {studentIdentity?.name?.[0] || 'U'}
                                 </div>
                                 <span className="font-bold text-sm">{studentIdentity?.name || 'You'}</span>
                            </div>
                            <span className="font-bold text-lg">
                                {leaderboardData.findIndex(s => s.roll === studentIdentity?.roll) !== -1 
                                    ? `#${leaderboardData.findIndex(s => s.roll === studentIdentity?.roll) + 1}` 
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {/* --- ANALYTICS VIEW --- */}
        {activeView === "analytics" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {!studentIdentity ? (
              <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm">
                <p className="text-gray-500 mb-4 text-sm">
                  Please verify your identity first.
                </p>
                <button
                  onClick={() => setActiveView("home")}
                  className="text-primary font-bold text-sm"
                >
                  Go Home
                </button>
              </div>
            ) : (
              <>
                {/* Main Stat Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-[32px] shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-xs font-bold uppercase opacity-70 mb-1">
                          Average Score
                        </p>
                        <h3 className="text-5xl font-black">
                          {analytics.avgPercentage.toFixed(0)}
                          <span className="text-2xl opacity-60">%</span>
                        </h3>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Activity size={24} />
                      </div>
                    </div>
                    {/* Graph */}
                    <div className="bg-black/10 rounded-2xl p-2 backdrop-blur-sm">
                      <PerformanceGraph data={analytics.graphData} />
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                      <CheckCircle2 size={18} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      Exams Taken
                    </p>
                    <h3 className="text-2xl font-black mt-1">
                      {analytics.takenCount}{" "}
                      <span className="text-sm font-medium text-gray-400">
                        / {analytics.totalConducted}
                      </span>
                    </h3>
                  </div>
                  <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg flex items-center justify-center mb-3">
                      <Star size={18} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      Points
                    </p>
                    <h3 className="text-2xl font-black mt-1">
                      {analytics.totalObtained.toFixed(0)}
                    </h3>
                  </div>
                </div>

                {/* Detailed History */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white uppercase tracking-wider">
                      Exam History
                    </h3>
                    <button
                      onClick={fetchStudentHistory}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                      <RefreshCw
                        size={16}
                        className={loadingHistory ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {mySubmissions.map((sub: any, idx) => {
                      const pct =
                        sub.total_marks > 0
                          ? (sub.obtained_marks / sub.total_marks) * 100
                          : 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleExamClick(sub.exam_id, true)}
                          className="flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                            >
                              {pct.toFixed(0)}%
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-white line-clamp-1">
                                {sub.exam_title}
                              </h4>
                              <p className="text-[10px] text-gray-500">
                                {new Date(sub.exam_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">
                              {Number(sub.obtained_marks).toFixed(1)}
                            </p>
                            {sub.rank > 0 && (
                              <p className="text-[10px] text-yellow-600 font-bold flex items-center justify-end gap-0.5">
                                <Trophy size={10} /> #{sub.rank}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- MISTAKES VIEW --- */}
        {activeView === "mistakes" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-10">
            {/* Header & Actions */}
            <div className="flex items-center justify-between sticky top-[60px] z-20 bg-[#F8F9FA]/95 dark:bg-black/95 backdrop-blur py-2">
              <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                Review{" "}
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {filteredMistakes.length}
                </span>
              </h2>
              <button
                onClick={fetchMistakes}
                className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm border border-gray-200 dark:border-white/10 active:scale-95 transition-transform"
              >
                <RefreshCw
                  size={16}
                  className={loadingMistakes ? "animate-spin" : ""}
                />
              </button>
            </div>

            {/* Subject Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={14} className="text-gray-400" />
              </div>
              <select
                value={mistakeSubjectFilter}
                onChange={(e) => setMistakeSubjectFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1D1D1F] dark:text-white appearance-none outline-none focus:border-primary/50 shadow-sm"
              >
                {mistakeSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>

            {!studentIdentity ? (
              <div className="text-center py-20 opacity-50">
                Verify identity first.
              </div>
            ) : loadingMistakes ? (
              <div className="text-center py-20">
                <Loader2 className="animate-spin mx-auto text-primary" />
              </div>
            ) : filteredMistakes.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <BrainCircuit
                  className="mx-auto text-green-500 mb-3"
                  size={40}
                />
                <h3 className="font-bold">Great Job!</h3>
                <p className="text-sm text-gray-400">
                  No mistakes found for this filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMistakes.map((ans, idx) => {
                  const isLast = idx === visibleMistakes.length - 1;
                  return (
                    <div
                      key={idx}
                      ref={isLast ? lastMistakeElementRef : null}
                      className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 animate-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                          {ans.subject || "General"}
                        </span>
                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-500 truncate max-w-[150px]">
                          {ans.exam_title}
                        </span>
                      </div>

                      <div className="font-semibold text-sm mb-4 leading-snug dark:text-gray-100">
                        <LatexText text={ans.question_text} />
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                          <span className="font-bold text-red-600 block mb-1 text-[10px] uppercase">
                            Your Answer
                          </span>
                          <LatexText
                            text={ans.selected_option || "(Skipped)"}
                          />
                        </div>
                        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                          <span className="font-bold text-green-600 block mb-1 text-[10px] uppercase">
                            Correct Answer
                          </span>
                          <LatexText text={ans.correct_answer} />
                        </div>
                      </div>

                      {ans.explanation && (
                        <div className="mt-4 pt-3 border-t border-gray-50 dark:border-white/5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                            <BookOpen size={10} /> Explanation
                          </p>
                          <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            <LatexText text={ans.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading Spinner for Infinite Scroll */}
                {visibleMistakes.length < filteredMistakes.length && (
                  <div className="py-4 flex justify-center">
                    <div className="bg-white dark:bg-[#1C1C1E] p-2 rounded-full shadow-lg border border-gray-100 dark:border-white/5">
                      <Loader2
                        className="animate-spin text-primary"
                        size={20}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- PROFILE VIEW --- */}
        {activeView === "profile" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {studentIdentity ? (
              <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[32px] text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-primary to-purple-600"></div>
                <div className="relative z-10 -mt-10 mb-4">
                  <div className="w-24 h-24 bg-white dark:bg-[#1C1C1E] rounded-full p-1.5 mx-auto">
                    <div className="w-full h-full bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-4xl font-bold text-gray-500">
                      {studentIdentity.name[0]}
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-[#1D1D1F] dark:text-white">
                  {studentIdentity.name}
                </h2>
                <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-50 dark:bg-white/5 inline-block px-3 py-1 rounded-lg">
                  Roll: {studentIdentity.roll}
                </p>

                <div className="mt-8 space-y-3">
                  <button className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-between text-sm font-bold shadow-sm">
                    <span className="flex items-center gap-3">
                      <Bell size={18} /> Notifications
                    </span>
                    <div className="w-8 h-5 bg-green-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-between text-sm font-bold text-red-600 border border-red-100 dark:border-red-900/20"
                  >
                    <span className="flex items-center gap-3">
                      <LogOut size={18} /> Logout
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Hexagon size={48} className="mx-auto text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Student Profile</h3>
                <p className="text-gray-500 mb-6 text-sm">
                  Join an exam to create your profile.
                </p>
                <button
                  onClick={() => setActiveView("home")}
                  className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg"
                >
                  Browse Exams
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Announcements Modal */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Bell size={20} className="text-orange-500" /> Announcements
              </h3>
              <button
                onClick={() => setShowAnnouncements(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-gray-400 border border-dashed rounded-xl">
                  No announcements yet
                </div>
              ) : (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10"
                  >
                    <h5 className="font-bold text-[#1D1D1F] dark:text-white text-sm mb-1">
                      {announcement.title}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {announcement.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-2 block flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(
                        announcement.created_at,
                      ).toLocaleDateString()}{" "}
                      at{" "}
                      {new Date(announcement.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
