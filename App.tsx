import React, { useState, useEffect, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Problems } from "./components/Problems";
import { Features } from "./components/Features";
import { Workflow } from "./components/Workflow";
import { Pricing } from "./components/Pricing";
import { Faq } from "./components/Faq";
import { Cta } from "./components/Cta";
import { Footer } from "./components/Footer";
import { DemoModal } from "./components/DemoModal";
import { LoginPage } from "./components/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { PublicExam } from "./components/PublicExam";
import { TeacherPortal } from "./components/TeacherPortal";
import { Toaster } from "react-hot-toast";
import { Loader2, Download } from "lucide-react";
import toast from "react-hot-toast";

// LAZY LOAD SUPER ADMIN PANEL (Security Feature)
// This ensures the code for the admin panel is not even downloaded by regular users.
const SuperAdminDashboard = React.lazy(
  () => import("./components/SuperAdminDashboard"),
);

// UPDATED: Matched to your screenshot
const SUPER_ADMIN_EMAIL = "alif@g.com";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    | "home"
    | "login"
    | "dashboard"
    | "public_exam"
    | "teacher_portal"
    | "super_admin"
    | "banned"
  >("home");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publicExamId, setPublicExamId] = useState<string | null>(null);
  const [publicTeacherId, setPublicTeacherId] = useState<string | null>(null);
  const [publicBatchToken, setPublicBatchToken] = useState<string | null>(null);
  const [isLeaderboard, setIsLeaderboard] = useState(false);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    // PWA Install Prompt Listener
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const examId = params.get("exam_id");
    const teacherId = params.get("teacher_id");
    const batchToken = params.get("batch_token");
    const leaderboardParam = params.get("leaderboard") === "true";

    // Route: Single Exam
    if (examId) {
      setPublicExamId(examId);
      setIsLeaderboard(leaderboardParam);
      setCurrentPage("public_exam");
      setLoading(false);
      return;
    }

    // Route: Teacher Portal (Global List)
    if (teacherId) {
      setPublicTeacherId(teacherId);
      setCurrentPage("teacher_portal");
      setLoading(false);
      return;
    }

    // Route: Batch Specific Portal
    if (batchToken) {
      setPublicBatchToken(batchToken);
      setCurrentPage("teacher_portal");
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
        } else {
          handleSessionRouting(session);
        }
      })
      .catch((err) => {
        console.error("Unexpected error getting session:", err);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionRouting(session);
    });

    // Fallback timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Loading timed out, forcing render");
          return false;
        }
        return prev;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleSessionRouting = async (session: any) => {
    try {
      setSession(session);
      if (session) {
        if (session.user.email === SUPER_ADMIN_EMAIL) {
          setCurrentPage("super_admin");
        } else {
          // Check if user is banned
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.warn("Profile fetch error (ignoring):", error);
            // If profile doesn't exist or error, assume valid user and go to dashboard
            setCurrentPage("dashboard");
          } else if (profile?.is_banned) {
            setCurrentPage("banned");
          } else {
            setCurrentPage("dashboard");
          }
        }
      } else {
        // Keep on home if not logged in and not in public route
        if (
          !window.location.search.includes("exam_id") &&
          !window.location.search.includes("teacher_id") &&
          !window.location.search.includes("batch_token") &&
          currentPage !== "teacher_portal"
        ) {
          setCurrentPage("home");
        }
      }
    } catch (error) {
      console.error("Session routing error:", error);
      // Fallback to home
      setCurrentPage("home");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const navigateToLogin = () => {
    window.scrollTo(0, 0);
    setCurrentPage("login");
  };

  const navigateToHome = () => {
    try {
      window.history.pushState({}, "", window.location.pathname);
    } catch (e) {
      console.warn("Could not update URL history:", e);
    }
    window.scrollTo(0, 0);
    setCurrentPage("home");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-400 font-medium animate-pulse">
            লোড হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  // Banned View
  if (currentPage === "banned") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 text-red-500">
          <Loader2 size={40} className="hidden" />{" "}
          {/* Placeholder import fix */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-2">
          Account Suspended
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8">
          Your account has been suspended by the administrator. Please contact
          support for more information.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // --- SECURITY: SUPER ADMIN ROUTE ---
  if (
    currentPage === "super_admin" &&
    session?.user?.email === SUPER_ADMIN_EMAIL
  ) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
            <Loader2 size={40} className="animate-spin text-red-600 mb-4" />
            <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-red-500">
              Establishing Secure Connection...
            </h2>
          </div>
        }
      >
        <Toaster
          position="top-right"
          toastOptions={{ style: { background: "#333", color: "#fff" } }}
        />
        <SuperAdminDashboard
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </Suspense>
    );
  }

  // Public Exam Route
  if (currentPage === "public_exam" && publicExamId) {
    return (
      <>
        <Toaster position="top-center" />
        <PublicExam
          examId={publicExamId}
          theme={theme}
          toggleTheme={toggleTheme}
          isLeaderboard={isLeaderboard}
        />
      </>
    );
  }

  // Teacher Portal Route (Either Global or Batch Specific)
  if (
    currentPage === "teacher_portal" &&
    (publicTeacherId || publicBatchToken)
  ) {
    return (
      <TeacherPortal
        teacherId={publicTeacherId || ""}
        batchToken={publicBatchToken || ""}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Authenticated Dashboard View (Regular Teachers)
  if (session && currentPage === "dashboard") {
    return (
      <>
        <Toaster position="top-right" />
        <DashboardLayout
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </>
    );
  }

  // Public Login View
  if (currentPage === "login") {
    return <LoginPage onBack={navigateToHome} theme={theme} />;
  }

  // Public Landing Page View
  return (
    <div className="min-h-screen flex flex-col font-sans dot-pattern text-[#111118] dark:text-white transition-colors duration-300">
      <Toaster position="bottom-center" />

      {/* PWA Install Button (Floating) */}
      {showInstallBtn && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-2xl font-bold animate-bounce hover:bg-primary-dark transition-colors"
        >
          <Download size={20} /> Install App
        </button>
      )}

      <Header
        onOpenModal={openModal}
        theme={theme}
        toggleTheme={toggleTheme}
        onLoginClick={navigateToLogin}
        isLoggedIn={!!session}
      />
      <main className="flex-grow">
        <Hero onOpenModal={navigateToLogin} theme={theme} />
        <Problems />
        <Features />
        <Workflow />
        <Pricing onOpenModal={navigateToLogin} />
        <Faq />
        <Cta onOpenModal={navigateToLogin} />
      </main>
      <Footer />
      <DemoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default App;
