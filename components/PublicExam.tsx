
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '../lib/supabase';
import { SecureStorage, obfuscateData, deobfuscateData } from '../lib/security';
import { GoogleGenAI } from "@google/genai";
import { Clock, CheckCircle2, User, Hash, Moon, Sun, Loader2, Lock, RefreshCw, ChevronRight, AlertCircle, Upload, Bot, Check, X, Trophy, Medal, Crown, TrendingUp, Home, BookOpenCheck, RotateCcw, AlertTriangle, LogOut, AlertOctagon, Ban, MinusCircle, Download, Send, Bell, Megaphone, Camera } from 'lucide-react';
import { LatexText } from './LatexText';
import { DoubtView } from './DoubtView';
import { Photocard } from './Photocard';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Isolated Written Answer Input to prevent full re-renders on every keystroke
const WrittenAnswerInput = memo(({ questionId, initialValue, onChange }: { questionId: string, initialValue: string, onChange: (id: string, val: string) => void }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    const lastSentValue = useRef(initialValue || '');
    
    useEffect(() => {
        if (initialValue !== lastSentValue.current) {
            setLocalValue(initialValue || '');
            lastSentValue.current = initialValue || '';
        }
    }, [initialValue]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localValue !== lastSentValue.current) {
                lastSentValue.current = localValue;
                onChange(questionId, localValue);
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [localValue, questionId, onChange]);

    return (
        <textarea 
            placeholder="অথবা টেক্সট লিখুন..."
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== lastSentValue.current) {
                    lastSentValue.current = localValue;
                    onChange(questionId, localValue);
                }
            }}
            className="w-full mt-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-primary/20 outline-none text-sm text-[#1D1D1F] dark:text-white resize-y min-h-[80px]"
        />
    );
});

// Isolated Header to prevent full re-renders
const ExamHeader = memo(({ title, questionsLength, answeredCount, initialTimeLeft, onTimeUp, onTimeUpdate, onManualSubmit, loading, unreadCount, onOpenAnnouncements }: any) => {
    const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
    const onTimeUpRef = useRef(onTimeUp);
    const onTimeUpdateRef = useRef(onTimeUpdate);

    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
        onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUp, onTimeUpdate]);
    
    useEffect(() => {
        setTimeLeft(initialTimeLeft);
    }, [initialTimeLeft]);

    useEffect(() => {
        if (initialTimeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev: number) => {
                const newTime = prev - 1;
                if (onTimeUpdateRef.current) onTimeUpdateRef.current(newTime);
                if (newTime <= 0) {
                    clearInterval(timer);
                    if (onTimeUpRef.current) onTimeUpRef.current();
                    return 0;
                }
                return newTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [initialTimeLeft]);

    const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };
    const progressPercent = questionsLength > 0 ? (answeredCount / questionsLength) * 100 : 0;

    return (
        <div className="flex-none z-50 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5 shadow-sm transition-all relative">
            <div className="h-16 flex items-center justify-between px-4 max-w-7xl mx-auto w-full gap-3">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h1 className="font-bold text-base text-[#1D1D1F] dark:text-white truncate leading-tight">
                        {title}
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">Q: {questionsLength}</span>
                        <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">Solved: {answeredCount}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onOpenAnnouncements}
                        className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Announcements"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1C1C1E] flex items-center justify-center">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            </span>
                        )}
                    </button>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs border transition-all ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-gray-50 dark:bg-white/10 text-[#1D1D1F] dark:text-white border-gray-200 dark:border-white/5'}`}>
                        <Clock size={14} className={timeLeft < 60 ? 'animate-spin' : ''} /> 
                        {formatTime(timeLeft)}
                    </div>
                    
                    <button 
                        onClick={onManualSubmit}
                        disabled={loading}
                        className="h-8 px-4 bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-lg font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} 
                        {loading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-200 dark:bg-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-primary to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
});
ExamHeader.displayName = 'ExamHeader';

interface PublicExamProps {
  examId: string;
  theme: string;
  toggleTheme: () => void;
  isLeaderboard?: boolean;
  isDoubtOnly?: boolean;
}

export const PublicExam: React.FC<PublicExamProps> = ({ examId, theme, toggleTheme, isLeaderboard = false, isDoubtOnly = false }) => {
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'initial' | 'waiting' | 'entry' | 'exam' | 'submitted' | 'expired' | 'leaderboard' | 'banned'>('initial');
  
  // Leaderboard Data
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // Student Info
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [savedIdentity, setSavedIdentity] = useState<{name: string, roll: string} | null>(null);
  
  // Exam State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, string>>({}); // Stores Base64 Preview
  const [attachmentFiles, setAttachmentFiles] = useState<Record<string, File>>({}); // Stores Actual Compressed Files
  const [aiFeedbacks, setAiFeedbacks] = useState<Record<string, any>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [initialTimeLeft, setInitialTimeLeft] = useState(0);
  const timeLeftRef = useRef(0);
  const [score, setScore] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [studentRank, setStudentRank] = useState<number | null>(null);
  const [warningCount, setWarningCount] = useState(0);

  // Result Filtering State
  const [resultFilter, setResultFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  // Submit Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Announcement State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Ref for auto-scrolling results
  const resultScrollRef = useRef<HTMLDivElement>(null);
  const isUploadingImageRef = useRef(false);

  useEffect(() => {
      if (exam?.created_by) {
          fetchAnnouncements(exam.created_by);
      }
  }, [exam?.created_by]);

  const fetchAnnouncements = async (teacherId: string) => {
      const { data } = await supabase
          .from('announcements')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
      
      if (data) {
          setAnnouncements(data);
          const lastRead = localStorage.getItem(`last_read_announcement_${teacherId}`);
          const newCount = data.filter((a: any) => !lastRead || new Date(a.created_at) > new Date(lastRead)).length;
          setUnreadCount(newCount);
      }
  };

  const handleOpenAnnouncements = () => {
      setShowAnnouncements(true);
      setUnreadCount(0);
      if (exam?.created_by) {
          localStorage.setItem(`last_read_announcement_${exam.created_by}`, new Date().toISOString());
      }
  };

  // Auto Scroll Effect for Results
  useEffect(() => {
      if (stage === 'submitted') {
          // Small timeout ensures the DOM element is rendered and ready
          setTimeout(() => {
              if (resultScrollRef.current) {
                  resultScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
              }
          }, 10);
      }
  }, [stage]);

  // Anti-cheat Listeners (3 Strikes Rule)
  useEffect(() => {
      if (stage !== 'exam') return;

      const handleVisibilityChange = () => {
          if (document.hidden) {
              if (isUploadingImageRef.current) return;
              setWarningCount(prev => {
                  const newCount = prev + 1;
                  if (newCount >= 3) {
                      toast.error('অতিরিক্ত ট্যাব পরিবর্তনের কারণে এক্সাম অটো-সাবমিট হচ্ছে!', { duration: 5000 });
                      submitExamRef.current(true); // Auto submit
                  } else {
                      toast('সতর্কতা: ট্যাব পরিবর্তন করা নিষিদ্ধ! (' + newCount + '/3)', { 
                          icon: '⚠️', 
                          duration: 5000,
                          style: {
                              border: '1px solid #EF4444',
                              color: '#EF4444',
                              fontWeight: 'bold'
                          }
                      });
                  }
                  return newCount;
              });
          } else {
              if (isUploadingImageRef.current) {
                  setTimeout(() => { isUploadingImageRef.current = false; }, 1000);
              }
          }
      };

      const handleFocus = () => {
          if (isUploadingImageRef.current) {
              setTimeout(() => { isUploadingImageRef.current = false; }, 1000);
          }
      };

      const handleContextMenu = (e: MouseEvent) => {
          e.preventDefault();
          return false;
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('contextmenu', handleContextMenu);

      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
          document.removeEventListener('contextmenu', handleContextMenu);
      };
  }, [stage]);

  // Helper to check mode dynamically
  const isEmbedMode = () => {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true';
  };

  const isEmbed = isEmbedMode();
  
  const answeredCount = questions.reduce((acc, q) => {
    const isMcqAnswered = q.question_type === 'mcq' && !!answers[q.id];
    const isWrittenAnswered = q.question_type === 'written' && (!!answers[q.id] || !!attachments[q.id]);
    return acc + (isMcqAnswered || isWrittenAnswered ? 1 : 0);
  }, 0);

  useEffect(() => {
      if (isEmbedMode()) {
          const saved = SecureStorage.getItem('exam_student_identity');
          if (saved && saved.name && saved.roll) {
              setSavedIdentity(saved);
              setStudentName(saved.name);
              setStudentRoll(saved.roll);
          }
      }
  }, []);

  const handleHomeClick = () => {
      if (isEmbedMode() && exam?.teacher_id) {
          const url = new URL(window.location.href);
          url.searchParams.delete('exam_id'); 
          url.searchParams.set('teacher_id', exam.teacher_id); 
          url.searchParams.set('embed', 'true'); 
          window.location.href = url.toString();
      } else {
          window.location.reload();
      }
  };

  const submitExamRef = useRef<(isAuto?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    checkExamStatus(false);
    
    const channel = supabase
      .channel(`public-exam-${examId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exams', filter: `id=eq.${examId}` },
        async (payload: any) => {
           const newStatus = payload.new.status;
           setExam((prev: any) => ({ ...prev, ...payload.new }));
           if (newStatus === 'published' && (stage === 'waiting' || stage === 'initial')) {
               toast.success('এক্সাম লাইভ হয়েছে!');
               await checkExamStatus(true); 
           } else if (newStatus === 'completed' && stage === 'exam') {
               toast('শিক্ষক এক্সাম শেষ করেছেন। অটোমেটিক সাবমিট হচ্ছে...', { icon: '🛑' });
               submitExamRef.current(true);
           }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [examId]);

  useEffect(() => {
    if (stage !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isUploadingImageRef.current) return;
        setTabSwitchCount(prev => prev + 1);
        // We don't need to show a second toast here since the first handler already shows one
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage]);

  useEffect(() => {
      if (isLeaderboard && exam) {
          fetchLeaderboard();
      }
  }, [isLeaderboard, exam]);

  useEffect(() => {
      if (stage === 'submitted' && examId && studentRoll) {
          const fetchRank = async () => {
              try {
                  const response = await fetch(`/api/get-leaderboard?exam_id=${examId}`);
                  if (response.ok) {
                      const data = await response.json();
                      if (Array.isArray(data)) {
                          const index = data.findIndex((entry: any) => entry.student_roll === studentRoll);
                          if (index !== -1) {
                              setStudentRank(index + 1);
                          }
                      }
                  }
              } catch (err) {
                  console.error("Failed to fetch rank", err);
              }
          };
          fetchRank();
      }
  }, [stage, examId, studentRoll]);

  const fetchLeaderboard = async () => {
      setLoading(true);
      try {
          // Try fetching from Redis-cached API first
          const response = await fetch(`/api/get-leaderboard?exam_id=${examId}`);
          if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                  setLeaderboardData(data);
                  setStage('leaderboard');
                  setLoading(false);
                  return;
              }
          }
          throw new Error("API returned invalid data");
      } catch (err) {
          console.warn("Leaderboard API failed, falling back to direct DB query", err);
          // Fallback: Direct DB Call
          const { data } = await supabase
            .from('student_submissions')
            .select('student_name, obtained_marks')
            .eq('exam_id', examId)
            .order('obtained_marks', { ascending: false })
            .limit(50); 
            
          if (data) setLeaderboardData(data);
          setStage('leaderboard');
          setLoading(false);
      }
  };

  const checkExamStatus = async (silent = false) => {
    if (isDoubtOnly) {
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
        const { data: examData, error } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (error) throw error;
        
        setExam(examData);

        if (isLeaderboard) {
            await fetchLeaderboard();
            return;
        }

        let nextStage: any = 'waiting';
        const now = new Date();
        const start = examData.start_time ? new Date(examData.start_time) : null;
        const end = examData.end_time ? new Date(examData.end_time) : null;

        if (examData.status === 'published') {
            // Check Schedule
            if (start && start > now) {
                nextStage = 'waiting';
            } else if (end && end < now) {
                nextStage = 'expired';
            } else {
                const qData = await fetchQuestionsInternal();
                if (qData) {
                    setQuestions(qData);
                    nextStage = 'entry';
                }
            }
        } else if (examData.status === 'completed') { 
            nextStage = 'expired'; 
        }

        setStage(prev => { if (prev === 'exam' || prev === 'submitted') return prev; return nextStage; });
    } catch (error: any) {
        if(!silent) setError(error.message || 'এক্সাম লোড করা সম্ভব হয়নি।');
    } finally {
        if (!silent) setLoading(false);
    }
  };

  const fetchQuestionsInternal = async () => {
      const CACHE_KEY = `exam_cache_obf_${examId}`;
      const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour

      // 1. Check LocalStorage (Client Cache)
      const cachedString = localStorage.getItem(CACHE_KEY);
      if (cachedString) {
          const cachedData = deobfuscateData(cachedString);
          if (cachedData && cachedData.questions && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
              console.log("Loaded questions from client cache");
              return cachedData.questions;
          }
      }

      // 2. Fetch from New API (Redis Cache)
      try {
          const response = await fetch(`/api/get-exam-questions?exam_id=${examId}`);
          
          if (response.ok) {
              const qData = await response.json();
              if (Array.isArray(qData) && qData.length > 0) {
                  // Update Client Cache
                  const dataToCache = { questions: qData, timestamp: Date.now() };
                  localStorage.setItem(CACHE_KEY, obfuscateData(dataToCache));
                  return qData;
              }
          }
      } catch (err) {
          console.error("API Fetch failed, using fallback", err);
      }

      // 3. Fallback: Direct DB Call (If API Fails)
      const { data: fallback } = await supabase.from('questions').select('*').eq('exam_id', examId).order('id', { ascending: true });
      if (fallback) {
          const dataToCache = { questions: fallback, timestamp: Date.now() };
          localStorage.setItem(CACHE_KEY, obfuscateData(dataToCache));
          return fallback;
      }
      
      return [];
  };

  const loadSavedAnswers = () => {
      const saved = localStorage.getItem(`exam_answers_${examId}_${studentRoll}`);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setAnswers(parsed);
              toast.success('পূর্বের উত্তর লোড করা হয়েছে', { icon: '📂' });
          } catch (e) { console.error('Error loading saved answers', e); }
      }
  };

  const getLocalSubmissionKey = (roll: string) => {
      return `exam_completed_${examId}_${roll.trim()}`;
  };

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
      setAnswers(prev => {
          const newAnswers = { ...prev, [questionId]: value };
          localStorage.setItem(`exam_answers_${examId}_${studentRoll}`, JSON.stringify(newAnswers));
          return newAnswers;
      });
  }, [examId, studentRoll]);

  // --- MERGE SOLUTIONS INTO QUESTIONS FOR DISPLAY ---
  const mergeSolutionsLocally = (cachedSolutions: any) => {
      if (!cachedSolutions) return;
      
      setQuestions(prev => prev.map(q => {
          const sol = cachedSolutions[q.id];
          if (sol) {
              return { 
                  ...q, 
                  correct_answer: sol.correct,
                  explanation: sol.explanation || q.explanation 
              };
          }
          return q;
      }));
  };

  const startExam = async () => {
    if (!studentName.trim() || !studentRoll.trim()) { toast.error('দয়া করে নাম এবং রোল নম্বর লিখুন'); return; }
    
    if (studentName.length > 50 || studentRoll.length > 20) {
        toast.error('নাম বা রোল নম্বর অত্যধিক বড়।');
        return;
    }

    setLoading(true);

    try {
        const localKey = getLocalSubmissionKey(studentRoll);
        const localDataStr = localStorage.getItem(localKey);
        
        // --- 1. LOCAL CACHE CHECK ---
        if (localDataStr) {
            try {
                const localData = JSON.parse(localDataStr);
                if (localData.status === 'submitted') {
                    toast.success('ফলাফল তৈরি আছে! (Local Cache)');
                    setScore(localData.score);
                    if (localData.time_taken) setTimeTaken(localData.time_taken);
                    if (localData.answers) {
                        const restoredAnswers: Record<string, string> = {};
                        localData.answers.forEach((ans: any) => {
                            if (ans.selected_option) restoredAnswers[ans.question_id] = ans.selected_option;
                            if (ans.text_answer) restoredAnswers[ans.question_id] = ans.text_answer;
                        });
                        setAnswers(restoredAnswers);
                    }
                    if (localData.solutions) {
                        mergeSolutionsLocally(localData.solutions);
                    }
                    setStage('submitted');
                    setLoading(false);
                    return;
                }
            } catch (e) { console.error("Local parse failed", e); }
        }

        // --- 2. BAN CHECK ---
        const { data: isBanned } = await supabase.rpc('check_student_ban', {
            p_teacher_id: exam.teacher_id,
            p_roll: studentRoll.trim()
        });

        if (isBanned) {
            setLoading(false);
            setStage('banned');
            return;
        }

        // --- 3. DB SUBMISSION CHECK ---
        const { data: existing } = await supabase
            .from('student_submissions')
            .select('*, student_answers(*)')
            .eq('exam_id', examId)
            .eq('student_roll', studentRoll.trim())
            .maybeSingle();

        if (existing) {
            toast.success('স্বাগতম! আপনার ফলাফল লোড করা হয়েছে।');
            setScore(existing.obtained_marks);
            if (existing.time_taken) setTimeTaken(existing.time_taken);
            const loadedAnswers: Record<string, string> = {};
            
            if (existing.student_answers) {
                existing.student_answers.forEach((ans: any) => {
                    if (ans.selected_option) loadedAnswers[ans.question_id] = ans.selected_option;
                    if (ans.text_answer) loadedAnswers[ans.question_id] = ans.text_answer;
                });
            }
            setAnswers(loadedAnswers);
            setStage('submitted');
            setLoading(false);
            return;
        }

        // --- 4. REDIS CACHE CHECK (New Layer) ---
        // If DB has nothing but user submitted recently (and cleared cache)
        const redisCheck = await fetch(`/api/check-result?exam_id=${examId}&student_roll=${studentRoll.trim()}`);
        if (redisCheck.ok) {
            const redisData = await redisCheck.json();
            if (redisData.found && redisData.data) {
                const r = redisData.data;
                toast.success('Recent submission found! (Synced)');
                setScore(r.score);
                if (r.answers) {
                    const restoredAnswers: Record<string, string> = {};
                    r.answers.forEach((ans: any) => {
                        if (ans.selected_option) restoredAnswers[ans.question_id] = ans.selected_option;
                        if (ans.text_answer) restoredAnswers[ans.question_id] = ans.text_answer;
                    });
                    setAnswers(restoredAnswers);
                }
                if (r.solutions) {
                    mergeSolutionsLocally(r.solutions);
                }
                
                // Restore to LocalStorage for persistence
                localStorage.setItem(localKey, JSON.stringify({
                    status: 'submitted',
                    timestamp: r.timestamp || Date.now(),
                    score: r.score,
                    answers: r.answers,
                    solutions: r.solutions,
                    time_taken: r.time_taken
                }));

                if (r.time_taken) setTimeTaken(r.time_taken);
                setStage('submitted');
                setLoading(false);
                return;
            }
        }

    } catch (err) {
        console.error("Check failed", err);
    }

    if (isEmbedMode()) {
        SecureStorage.setItem('exam_student_identity', { name: studentName, roll: studentRoll });
        if (exam?.teacher_id) {
            supabase.from('students').upsert({
                teacher_id: exam.teacher_id,
                student_name: studentName,
                student_roll: studentRoll,
                last_active_at: new Date().toISOString()
            }, { onConflict: 'teacher_id,student_roll' }).then(({ error }: any) => {
                if (error) console.error("Error saving student info:", error);
            });
        }
    } 

    let allowedSeconds = exam.duration_minutes * 60;
    if (exam.end_time) {
        const secondsUntilEnd = Math.floor((new Date(exam.end_time).getTime() - new Date().getTime()) / 1000);
        if (secondsUntilEnd <= 0) { 
            setStage('expired'); 
            setLoading(false);
            return; 
        }
        if (secondsUntilEnd < allowedSeconds) allowedSeconds = secondsUntilEnd;
    }
    
    loadSavedAnswers();
    setInitialTimeLeft(allowedSeconds);
    timeLeftRef.current = allowedSeconds;
    setLoading(false);
    setStage('exam');
  };

  const clearIdentity = () => {
      SecureStorage.removeItem('exam_student_identity');
      setSavedIdentity(null);
      setStudentName('');
      setStudentRoll('');
  };

  const handleImageUpload = useCallback(async (questionId: string, file: File) => {
      if (!file) {
          isUploadingImageRef.current = false;
          return;
      }
      const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1920, useWebWorker: true };
      try {
          const compressedFile = await imageCompression(file, options);
          setAttachmentFiles(prev => ({ ...prev, [questionId]: compressedFile }));
          
          const objectUrl = URL.createObjectURL(compressedFile);
          setAttachments(prev => ({ ...prev, [questionId]: objectUrl }));
          isUploadingImageRef.current = false;
      } catch (error) { 
          toast.error("Image processing failed."); 
          isUploadingImageRef.current = false;
      }
  }, []);

  // ----------------------------------------------------
  // SUBMIT LOGIC USING REDIS QUEUE + LOCAL CACHE
  // ----------------------------------------------------
  const submitExam = async (isAuto = false) => {
    if (stage === 'submitted' || loading) return;
    setLoading(true);

    if (isAuto) toast('সময় শেষ! অটোমেটিক সাবমিট হচ্ছে...', { icon: '⏰' });
    
    try {
      // 1. Upload Images (Parallel)
      const uploadedUrls: Record<string, string> = {};
      const uploadPromises = Object.entries(attachmentFiles).map(async ([qId, file]) => {
          const sanitizedRoll = studentRoll.trim().replace(/[^a-z0-9]/gi, '_');
          const fileName = `${examId}/${sanitizedRoll}/${qId}_${Date.now()}.jpg`;
          const { data, error } = await supabase.storage.from('exam-submissions').upload(fileName, file, { cacheControl: '3600', upsert: false });
          if (error) return null;
          const { data: { publicUrl } } = supabase.storage.from('exam-submissions').getPublicUrl(fileName);
          return { qId, url: publicUrl };
      });

      const results = await Promise.all(uploadPromises);
      results.forEach(res => { if (res) uploadedUrls[res.qId] = res.url; });

      // 2. Prepare Payload
      const answersArray = questions.map(q => {
          return {
              question_id: q.id,
              selected_option: q.question_type === 'mcq' ? (answers[q.id] || '') : null,
              text_answer: q.question_type !== 'mcq' ? (answers[q.id] || '') : null,
              attachment_url: uploadedUrls[q.id] || null
          };
      });

      // 3. Call Serverless Function
      const response = await fetch('/api/submit-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              exam_id: examId,
              student_name: studentName,
              student_roll: studentRoll.trim(),
              answers: answersArray,
              time_taken: (exam.duration_minutes * 60) - timeLeftRef.current,
              metadata: {
                  tab_switches: tabSwitchCount,
                  device: /Mobile|Android|iP(ad|hone)/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                  browser: navigator.userAgent,
                  screen_resolution: `${window.screen.width}x${window.screen.height}`
              }
          })
      });

      const result = await response.json();

      if (!response.ok) {
          if (result.code === 'ALREADY_SUBMITTED') {
              toast.success('আপনার এক্সাম আগেই জমা হয়েছে।', { duration: 5000 });
              setStage('submitted');
              return; 
          }
          throw new Error(result.error || 'Submission failed');
      }

      // 4. Success & Local Cache
      setScore(result.score);
      setStage('submitted');
      setIsSubmitModalOpen(false);
      localStorage.removeItem(`exam_answers_${examId}_${studentRoll}`);
      
      // CRITICAL: MERGE SOLUTIONS FOR DISPLAY IF AVAILABLE
      if (result.solutions) {
          mergeSolutionsLocally(result.solutions);
      }

      // Save complete state to avoid DB calls on refresh
      const localKey = getLocalSubmissionKey(studentRoll);
      const calculatedTimeTaken = (exam.duration_minutes * 60) - timeLeftRef.current;
      localStorage.setItem(localKey, JSON.stringify({
          status: 'submitted',
          timestamp: Date.now(),
          score: result.score,
          answers: answersArray, 
          solutions: result.solutions, // SAVE SOLUTIONS TO LOCAL STORAGE
          time_taken: calculatedTimeTaken
      }));
      setTimeTaken(calculatedTimeTaken);
      
      const hasWritten = questions.some(q => q.question_type === 'written');
      if (hasWritten) {
          toast.success('সফলভাবে সাবমিট হয়েছে! লিখিত খাতা চেক করার পর পূর্ণাঙ্গ রেজাল্ট পাবেন।', { duration: 5000 });
      } else {
          toast.success('সফলভাবে সাবমিট হয়েছে!', { duration: 5000 });
      }

    } catch (error: any) {
      console.error(error);
      toast.error(`সাবমিট সমস্যা: ${error.message || 'Unknown Error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      submitExamRef.current = submitExam;
  });

  const handleManualSubmitClick = useCallback(() => {
      setIsSubmitModalOpen(true);
  }, []);

  const getRankAvatar = (name: string) => {
      const initial = name.charAt(0).toUpperCase();
      const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500'];
      const color = colors[name.length % colors.length];
      return (
          <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
              {initial}
          </div>
      );
  };

  const downloadMistakesPDF = () => {
        const mistakes = questions.filter(q => q.question_type === 'mcq' && answers[q.id] && answers[q.id] !== q.correct_answer);
        
        if (mistakes.length === 0) {
            toast.error("কোনো ভুল উত্তর নেই! আপনি সব সঠিক করেছেন।");
            return;
        }

        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(220, 38, 38);
        doc.text("Mistakes Report", 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(60);
        doc.text(`Exam: ${exam.title}`, 14, 28);
        doc.text(`Student: ${studentName || studentRoll}`, 14, 34);

        const tableRows: any[] = [];
        
        mistakes.forEach((q, i) => {
            const cleanQ = q.question_text.replace(/(\$\$|\$|\\\[|\\\]|\\\(|\\\))/g, '');
            const cleanExpl = q.explanation ? q.explanation.replace(/(\$\$|\$|\\\[|\\\]|\\\(|\\\))/g, '') : 'N/A';
            
            tableRows.push([
                i + 1,
                cleanQ,
                answers[q.id],
                q.correct_answer, 
                cleanExpl
            ]);
        });

        autoTable(doc, {
            head: [["#", "Question", "Your Answer", "Correct", "Explanation"]],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [220, 38, 38] },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 50 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 'auto' }
            }
        });

        doc.save(`Mistakes_${studentRoll.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        toast.success("Mistakes report downloaded!");
    };

  if (loading && stage === 'initial') return <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center z-[100]"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  
  if (stage === 'banned') {
      return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 z-[100]">
              <div className="text-center bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-sm w-full border border-red-100 dark:border-red-900/30">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Ban size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white mb-2">Access Denied</h2>
                  <p className="text-gray-500 text-sm mb-6">
                      You have been banned from accessing exams by this teacher.
                  </p>
                  <button onClick={handleHomeClick} className="w-full py-3 bg-gray-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                      Back to Home
                  </button>
              </div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 z-[100]">
              <div className="text-center bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-sm w-full">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <AlertOctagon size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white mb-2">সমস্যা হয়েছে</h2>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <button onClick={() => window.location.reload()} className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">রিফ্রেশ করুন</button>
              </div>
          </div>
      );
  }

  if (isDoubtOnly) {
      return (
          <div className="fixed inset-0 bg-[#F8F9FA] dark:bg-black flex flex-col z-[100]">
              <div className="flex-1 w-full h-full">
                  <DoubtView onBack={handleHomeClick} />
              </div>
          </div>
      );
  }

  if (!exam) {
       return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 z-[100]">
              <div className="text-center bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-sm w-full">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                      <AlertCircle size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white mb-2">এক্সাম পাওয়া যায়নি</h2>
                  <p className="text-gray-500 text-sm">লিংকটি সঠিক কিনা যাচাই করুন অথবা শিক্ষকের সাথে যোগাযোগ করুন।</p>
                  <a href="/" className="mt-6 block w-full py-3 bg-gray-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white rounded-xl font-bold text-sm">হোম পেজে যান</a>
              </div>
          </div>
      );
  }

  if (stage === 'waiting') {
      return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 z-[100]">
              <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] p-8 rounded-[32px] text-center shadow-xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500 animate-pulse">
                      <Clock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white mb-2">{exam.title}</h2>
                  <p className="text-gray-500 font-medium mb-8 text-sm">এক্সামটি এখনো শুরু হয়নি। দয়া করে অপেক্ষা করুন।</p>
                  
                  {exam.start_time && (
                      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 mb-8">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Start Time</p>
                          <p className="text-xl font-bold text-[#1D1D1F] dark:text-white">{new Date(exam.start_time).toLocaleString()}</p>
                      </div>
                  )}
                  
                  <button onClick={() => window.location.reload()} className="w-full py-3.5 bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <RefreshCw size={18} /> রিফ্রেশ করুন
                  </button>
              </div>
          </div>
      )
  }

  if (stage === 'expired') {
       return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-4 z-[100]">
              <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] p-8 rounded-[32px] text-center shadow-xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                      <Lock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white mb-2">{exam.title}</h2>
                  <p className="text-gray-500 font-medium mb-8 text-sm">এই এক্সামটির সময় শেষ হয়ে গেছে। আপনি এখন আর অংশগ্রহণ করতে পারবেন না।</p>
                  
                  <div className="flex gap-3">
                      <button onClick={handleHomeClick} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">হোম</button>
                      <a href={`/?exam_id=${examId}&leaderboard=true`} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">রেজাল্ট দেখুন</a>
                  </div>
              </div>
          </div>
      )
  }

  // --- LEADERBOARD VIEW --- 
  if (stage === 'leaderboard') {
      const top3 = leaderboardData.slice(0, 3);
      const rest = leaderboardData.slice(3);

      return (
          <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-black overflow-y-auto font-sans pb-20 z-[100]">
              <button onClick={handleHomeClick} className="fixed top-4 left-4 z-50 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all shadow-lg"><Home size={20} /></button>
              <div className="relative bg-[#1D1D1F] dark:bg-[#111] text-white pt-12 pb-24 md:pb-32 px-4 rounded-b-[40px] md:rounded-b-[60px] shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                      <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-primary/40 rounded-full blur-[100px] animate-pulse"></div>
                      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/40 rounded-full blur-[100px]"></div>
                  </div>
                  <div className="relative z-10 max-w-4xl mx-auto text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white/80 mb-2"><Trophy size={14} className="text-yellow-400" /> Leaderboard</div>
                      <h1 className="text-2xl md:text-5xl font-black tracking-tight line-clamp-2">{exam.title}</h1>
                      <p className="text-white/60 font-medium text-sm">Top 20 performers</p>
                  </div>
              </div>
              <div className="max-w-4xl mx-auto px-4 -mt-16 md:-mt-24 relative z-20 mb-8">
                  {top3.length > 0 ? (
                    <div className="flex justify-center items-end gap-2 md:gap-8">
                        {top3[1] && <div className="flex flex-col items-center w-1/3 md:w-32 animate-in slide-in-from-bottom-10 duration-700 delay-100"><div className="mb-2 md:mb-3 relative"><div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-4 border-gray-300 bg-gray-200 shadow-xl overflow-hidden"><div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-xl md:text-2xl">{top3[1].student_name[0]}</div></div><div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/20">#2</div></div><div className="text-center mb-1 md:mb-2 w-full px-1"><h3 className="font-bold text-[#1D1D1F] dark:text-white text-[10px] md:text-base truncate w-full block">{top3[1].student_name}</h3><p className="text-[9px] md:text-xs text-gray-500 font-mono">{Number(top3[1].obtained_marks).toFixed(1)}</p></div><div className="w-full h-20 md:h-36 bg-gradient-to-t from-gray-400 to-gray-200 rounded-t-xl md:rounded-t-2xl shadow-lg border-t border-white/30 relative overflow-hidden group"><div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl md:text-4xl font-black text-gray-500/20">2</div></div></div>}
                        {top3[0] && <div className="flex flex-col items-center w-1/3 md:w-40 -mt-8 md:-mt-16 z-10 animate-in slide-in-from-bottom-12 duration-700"><div className="mb-2 md:mb-3 relative"><Crown size={24} className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-lg animate-bounce md:w-8 md:h-8" fill="currentColor" /><div className="w-16 h-16 md:w-28 md:h-28 rounded-full border-4 border-yellow-300 bg-yellow-100 shadow-2xl shadow-yellow-500/30 overflow-hidden"><div className="w-full h-full flex items-center justify-center bg-yellow-100 text-yellow-600 font-bold text-2xl md:text-4xl">{top3[0].student_name[0]}</div></div><div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-3 py-0.5 rounded-full shadow-lg border border-white/20">#1</div></div><div className="text-center mb-1 md:mb-2 w-full px-1"><h3 className="font-bold text-[#1D1D1F] dark:text-white text-xs md:text-xl truncate w-full block">{top3[0].student_name}</h3><p className="text-[10px] md:text-sm font-bold text-yellow-600 dark:text-yellow-400 font-mono">{Number(top3[0].obtained_marks).toFixed(1)}</p></div><div className="w-full h-28 md:h-48 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-xl md:rounded-t-2xl shadow-2xl shadow-yellow-500/20 border-t border-white/30 relative overflow-hidden group"><div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 text-4xl md:text-5xl font-black text-yellow-700/20">1</div></div></div>}
                        {top3[2] && <div className="flex flex-col items-center w-1/3 md:w-32 animate-in slide-in-from-bottom-10 duration-700 delay-200"><div className="mb-2 md:mb-3 relative"><div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-4 border-orange-300 bg-orange-100 shadow-xl overflow-hidden"><div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600 font-bold text-xl md:text-2xl">{top3[2].student_name[0]}</div></div><div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/20">#3</div></div><div className="text-center mb-1 md:mb-2 w-full px-1"><h3 className="font-bold text-[#1D1D1F] dark:text-white text-[10px] md:text-base truncate w-full block">{top3[2].student_name}</h3><p className="text-[9px] md:text-xs text-gray-500 font-mono">{Number(top3[2].obtained_marks).toFixed(1)}</p></div><div className="w-full h-16 md:h-28 bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-xl md:rounded-t-2xl shadow-lg border-t border-white/30 relative overflow-hidden group"><div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 text-2xl md:text-4xl font-black text-orange-800/20">3</div></div></div>}
                    </div>
                  ) : <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm"><p className="text-gray-400">No submissions yet.</p></div>}
              </div>
              {rest.length > 0 && <div className="max-w-3xl mx-auto px-4 space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">Other Participants</h3>{rest.map((student, idx) => (<div key={idx} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-white/5 hover:scale-[1.01] transition-transform"><div className="w-8 text-center font-bold text-gray-400 text-sm">#{idx + 4}</div>{getRankAvatar(student.student_name)}<div className="flex-1 min-w-0"><h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm md:text-base truncate">{student.student_name}</h4></div><div className="text-right"><span className="font-bold text-primary text-base md:text-lg">{Number(student.obtained_marks).toFixed(1)}</span></div></div>))}</div>}
               <div className="text-center mt-12 pb-8"><a href="/" className="text-xs font-bold text-gray-400 hover:text-primary transition-colors uppercase tracking-widest">Powered by EXAMiO</a></div>
          </div>
      )
  }

  // --- ENTRY SCREEN ---
  if (stage === 'entry') { 
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-black flex items-center justify-center p-4 z-[100]">
        <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-2xl p-8 border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
           <div className="flex justify-between items-center mb-8"><div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black shadow-lg"><Hash size={24} /></div><button onClick={toggleTheme} className="p-3 bg-gray-50 dark:bg-white/10 rounded-full dark:text-white hover:bg-gray-100 transition-colors">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button></div>
           <h1 className="text-3xl font-bold text-[#1D1D1F] dark:text-white mb-2 tracking-tight">{exam?.title}</h1>
           {savedIdentity && isEmbedMode() ? <div className="space-y-6 animate-in fade-in"><p className="text-gray-500 font-medium">স্বাগতম ফিরে আসার জন্য!</p><div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center gap-4"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">{savedIdentity.name.charAt(0).toUpperCase()}</div><div><h3 className="font-bold text-[#1D1D1F] dark:text-white text-lg">{savedIdentity.name}</h3><p className="text-sm text-gray-500 font-mono">Roll: {savedIdentity.roll}</p></div></div><button onClick={startExam} disabled={loading} className="group w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary-dark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{loading ? <Loader2 className="animate-spin" /> : <>Start Exam <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}</button><div className="text-center"><button onClick={clearIdentity} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto"><LogOut size={14} /> Not you? Switch Account</button></div></div> : <div className="space-y-5 animate-in fade-in"><p className="text-gray-500 mb-4 font-medium">আপনার তথ্য দিয়ে এক্সাম শুরু করুন</p><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Student Name</label><div className="flex items-center gap-3 bg-gray-50 dark:bg-black/40 px-5 h-14 rounded-2xl border border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-black focus-within:shadow-lg focus-within:shadow-primary/10 transition-all"><User size={20} className="text-gray-400" /><input type="text" placeholder="আপনার নাম লিখুন" value={studentName} onChange={e => setStudentName(e.target.value)} className="bg-transparent outline-none w-full text-lg font-medium text-[#1D1D1F] dark:text-white placeholder:text-gray-400" /></div></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Roll Number</label><div className="flex items-center gap-3 bg-gray-50 dark:bg-black/40 px-5 h-14 rounded-2xl border border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-black focus-within:shadow-lg focus-within:shadow-primary/10 transition-all"><Hash size={20} className="text-gray-400" /><input type="text" placeholder="রোল নম্বর" value={studentRoll} onChange={e => setStudentRoll(e.target.value)} className="bg-transparent outline-none w-full text-lg font-medium text-[#1D1D1F] dark:text-white placeholder:text-gray-400" /></div></div><div className="pt-4"><button onClick={startExam} disabled={loading} className="group w-full h-14 bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{loading ? <Loader2 className="animate-spin" /> : <>এক্সাম শুরু করুন <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}</button></div></div>}
        </div>
      </div>
    );
  }
  
  // --- SUBMITTED SCREEN (RESULTS VIEW) ---
  if (stage === 'submitted') {
      // Logic Check: Should we show results?
      // Default to true if the property is undefined (for backward compatibility)
      const showResults = exam.show_results_instant !== false;

      if (!showResults) {
          return (
              <div className="fixed inset-0 w-full h-full bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center z-[50] p-6 text-center animate-in fade-in zoom-in-95">
                  <div className="bg-white dark:bg-[#1C1C1E] p-10 rounded-[32px] shadow-2xl max-w-md w-full border border-gray-100 dark:border-white/5">
                      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-500 shadow-sm">
                          <CheckCircle2 size={48} strokeWidth={2.5} />
                      </div>
                      <h2 className="text-3xl font-black text-[#1D1D1F] dark:text-white mb-2 tracking-tight">Exam Submitted!</h2>
                      <p className="text-gray-500 font-medium mb-8 text-sm md:text-base leading-relaxed">
                          আপনার উত্তরপত্র সফলভাবে জমা নেওয়া হয়েছে। খুব শীঘ্রই ফলাফল প্রকাশ করা হবে।
                      </p>
                      
                      <button onClick={handleHomeClick} className="w-full py-4 bg-[#1D1D1F] dark:bg-white text-white dark:text-black rounded-2xl font-bold text-base shadow-xl shadow-black/10 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                          <Home size={18} /> হোমে ফিরে যান
                      </button>
                  </div>
              </div>
          );
      }

      // ... existing result calculation logic ...
      const correctCount = questions.filter(q => q.question_type === 'mcq' && answers[q.id] === q.correct_answer).length;
      const wrongCount = questions.filter(q => q.question_type === 'mcq' && answers[q.id] && answers[q.id] !== q.correct_answer).length;
      const skippedCount = questions.filter(q => q.question_type === 'mcq' && !answers[q.id]).length;
      const negativeMarks = questions.reduce((acc, q) => {
          if (q.question_type === 'mcq' && answers[q.id] && answers[q.id] !== q.correct_answer) {
              return acc + ((q.marks || 1) * (Number(exam.negative_marking || 0) / 100));
          }
          return acc;
      }, 0);

      const displayedQuestions = questions.filter(q => {
          if (resultFilter === 'correct') return q.question_type === 'mcq' && answers[q.id] === q.correct_answer;
          if (resultFilter === 'wrong') return q.question_type === 'mcq' && answers[q.id] && answers[q.id] !== q.correct_answer;
          return true;
      });

      return (
        <div className="fixed inset-0 w-full h-full bg-[#F5F5F7] dark:bg-black flex flex-col z-[50] overscroll-none">
          <div className="flex-none z-50 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5 shadow-sm transition-all relative">
             <div className="h-16 flex items-center justify-between px-4 max-w-7xl mx-auto w-full gap-3">
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h1 className="font-bold text-base text-[#1D1D1F] dark:text-white truncate leading-tight">
                         {exam.title}
                     </h1>
                     <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                         <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">Result View</span>
                     </div>
                 </div>
                 <button onClick={handleHomeClick} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"><Home size={16} /></button>
             </div>
          </div>

          <div ref={resultScrollRef} className="flex-1 overflow-y-auto overscroll-contain scroll-smooth w-full relative pb-safe">
              <div className="max-w-3xl mx-auto pt-8 px-3 md:px-6 pb-12 space-y-8">
                  <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Score</p>
                      <div onClick={() => setResultFilter('all')} className="cursor-pointer group relative">
                          <h1 className={`text-7xl md:text-8xl font-black tracking-tighter leading-none mb-1 transition-colors ${resultFilter === 'all' ? 'text-primary' : 'text-[#1D1D1F] dark:text-white'}`}>{Number(score).toFixed(2)}</h1>
                          <p className="text-sm font-bold text-gray-400">OUT OF {questions.reduce((a,b) => a + (b.marks||1), 0)}</p>
                      </div>
                      <div className="mt-8 flex flex-wrap justify-center gap-3 md:gap-4">
                          <button onClick={() => setResultFilter('correct')} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${resultFilter === 'correct' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'}`}><CheckCircle2 size={16} className={resultFilter === 'correct' ? 'text-green-600' : 'text-gray-400'} /><span className="text-sm font-bold">Correct: {correctCount}</span></button>
                          <button onClick={() => setResultFilter('wrong')} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${resultFilter === 'wrong' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400' : 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'}`}><X size={16} className={resultFilter === 'wrong' ? 'text-red-600' : 'text-gray-400'} /><span className="text-sm font-bold">Wrong: {wrongCount}</span></button>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/10 text-gray-500"><AlertTriangle size={16} className="text-orange-500" /><span className="text-sm font-bold">Negative: -{Number(negativeMarks).toFixed(2)}</span></div>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/10 text-gray-500"><MinusCircle size={16} className="text-gray-400" /><span className="text-sm font-bold">Skipped: {skippedCount}</span></div>
                      </div>
                      <button onClick={downloadMistakesPDF} className="mt-6 flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/30 shadow-sm"><Download size={16} /> Download Incorrect Answers PDF</button>
                      
                      {exam?.allow_photocard && (
                        <Photocard 
                          studentName={studentName || savedIdentity?.name || 'Student'}
                          studentRoll={studentRoll || savedIdentity?.roll || 'N/A'}
                          examTitle={exam.title}
                          score={score || 0}
                          totalMarks={questions.reduce((a,b) => a + (b.marks||1), 0)}
                          correctCount={correctCount}
                          wrongCount={wrongCount}
                          skippedCount={skippedCount}
                          avgTimePerQuestion={timeTaken !== null && questions.length > 0 ? `${(timeTaken / questions.length).toFixed(1)}s` : "N/A"}
                          rank={studentRank || undefined}
                        />
                      )}

                      {resultFilter !== 'all' && <button onClick={() => setResultFilter('all')} className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1"><RotateCcw size={12} /> View Full Paper</button>}
                  </div>

                  {displayedQuestions.map((q, index) => {
                      const userAnswer = answers[q.id];
                      const isCorrect = q.question_type === 'mcq' && userAnswer === q.correct_answer;
                      const aiResult = aiFeedbacks[q.id] || null;
                      const obtainedMark = questionMarks[q.id]; 
                      
                      return (
                         <div key={q.id} id={`q-${q.id}`} className={`group bg-white dark:bg-[#1C1C1E] p-4 md:p-6 rounded-[24px] shadow-sm border transition-all duration-300 ${isCorrect ? 'border-green-200 dark:border-green-900/30' : userAnswer ? 'border-red-200 dark:border-red-900/30' : 'border-gray-100 dark:border-white/5'}`}>
                             <div className="flex items-start justify-between mb-3">
                                 <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-gray-500 shrink-0">{questions.findIndex(qu => qu.id === q.id) + 1}</span><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded">Mark: {q.marks || 1}</span></div>
                                 {q.question_type === 'mcq' ? ( userAnswer ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isCorrect ? <Check size={10}/> : <X size={10}/>} {isCorrect ? 'Correct' : 'Wrong'}</span> : <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Skipped</span> ) : ( obtainedMark !== undefined ? <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Obtained: {obtainedMark}</span> : <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Checking...</span> )}
                             </div>
                             <h3 className="text-base md:text-lg font-medium text-[#1D1D1F] dark:text-white leading-snug mb-4 select-none"><LatexText text={q.question_text} /></h3>
                             {q.question_type === 'mcq' && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                     {q.options?.map((opt: string, i: number) => {
                                         const isSelected = userAnswer === opt;
                                         const isThisCorrect = opt === q.correct_answer;
                                         let buttonStyle = 'bg-gray-5 dark:bg-white/5 border-transparent opacity-60'; 
                                         if (isThisCorrect) { buttonStyle = 'bg-green-100 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500 opacity-100'; } else if (isSelected && !isThisCorrect) { buttonStyle = 'bg-red-50 dark:bg-red-900/20 border-red-500 opacity-100'; }
                                         return (
                                             <div key={i} className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${buttonStyle}`}>
                                                 <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isThisCorrect ? 'border-green-500 bg-green-500' : ''} ${isSelected && !isThisCorrect ? 'border-red-500 bg-red-500' : ''} ${!isSelected && !isThisCorrect ? 'border-gray-300 dark:border-gray-600' : ''}`}>{(isThisCorrect || isSelected) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}</div>
                                                 <span className={`text-sm md:text-base font-medium transition-colors select-none text-gray-700 dark:text-gray-300`}><LatexText text={opt} /></span>
                                             </div>
                                         );
                                     })}
                                 </div>
                             )}
                             {q.question_type === 'written' && (
                                 <div className="mt-3">
                                    {attachments[q.id] ? <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black"><img src={attachments[q.id].startsWith('http') ? attachments[q.id] : `data:image/png;base64,${attachments[q.id].split(',').pop()}`} alt="Answer" className="w-full h-auto max-h-64 object-contain" /></div> : <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl text-center text-xs text-gray-400 italic">No answer uploaded</div>}
                                    {answers[q.id] && <div className="mt-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-sm text-[#1D1D1F] dark:text-white">{answers[q.id]}</div>}
                                    {aiResult && <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl"><div className="flex items-center gap-2 mb-1 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider"><Bot size={14} /> AI Feedback</div><p className="text-indigo-900 dark:text-indigo-100 text-sm leading-relaxed mb-2">{aiResult.feedback}</p><div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 border-t border-indigo-200 dark:border-indigo-900/30 pt-2"><span>AI Check</span><span>Marks: {aiResult.marks} / {q.marks || 1}</span></div></div>}
                                 </div>
                             )}
                             {q.explanation && (
                                 <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 overflow-hidden">
                                    <div className="flex items-center gap-1.5 mb-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider"><BookOpenCheck size={14} /> Explanation</div>
                                    <div className="text-blue-900 dark:text-blue-100 text-sm leading-relaxed overflow-x-auto"><LatexText text={q.explanation} /></div>
                                 </div>
                             )}
                         </div>
                      );
                  })}
              </div>
          </div>
        </div>
      );
  }

  // --- EXAM SCREEN ---
  return (
    <div className="fixed inset-0 w-full h-full bg-[#F5F5F7] dark:bg-black flex flex-col z-[50] overscroll-none" onContextMenu={(e) => e.preventDefault()}>
      
      {/* Isolated Header */}
      <ExamHeader 
        title={exam.title}
        questionsLength={questions.length}
        answeredCount={answeredCount}
        initialTimeLeft={initialTimeLeft}
        onTimeUp={() => submitExamRef.current(true)}
        onTimeUpdate={(newTime: number) => { timeLeftRef.current = newTime; }}
        onManualSubmit={handleManualSubmitClick}
        loading={loading}
        unreadCount={unreadCount}
        onOpenAnnouncements={handleOpenAnnouncements}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth w-full relative pb-safe" id="exam-scroll-container">
          <div className={`max-w-3xl mx-auto ${isEmbed ? 'pt-6' : 'pt-6'} px-3 md:px-6 pb-12 space-y-4`}>
             {questions.map((q, index) => (
                 <div 
                    key={q.id} 
                    id={`q-${q.id}`} 
                    onCopy={(e) => e.preventDefault()}
                    className="group bg-white dark:bg-[#1C1C1E] p-4 md:p-6 rounded-[20px] shadow-sm border border-gray-100 dark:border-white/5 hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300"
                 >
                     <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-2">
                             <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-gray-500 shrink-0">
                                 {index + 1}
                             </span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                Mark: {q.marks || 1}
                             </span>
                         </div>
                         {((q.question_type === 'mcq' && answers[q.id]) || (q.question_type === 'written' && attachments[q.id])) && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in zoom-in">
                                <CheckCircle2 size={10} /> <span className="hidden sm:inline">Answered</span>
                            </span>
                         )}
                     </div>

                     <h3 className="text-base md:text-lg font-medium text-[#1D1D1F] dark:text-white leading-snug mb-4 select-none">
                         <LatexText text={q.question_text} />
                     </h3>

                     {q.question_type === 'mcq' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                             {q.options?.map((opt: string, i: number) => {
                                 const isSelected = answers[q.id] === opt;
                                 return (
                                     <label 
                                        key={i} 
                                        className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 active:scale-[0.98]
                                            ${isSelected 
                                                ? 'bg-primary/5 border-primary shadow-inner' 
                                                : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                     >
                                         <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                             ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                             {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                         </div>
                                         <input 
                                            type="radio" 
                                            name={`q-${q.id}`} 
                                            value={opt} 
                                            checked={isSelected}
                                            onChange={() => handleAnswerChange(q.id, opt)}
                                            className="hidden" 
                                         />
                                         <span className={`text-sm md:text-base font-medium transition-colors select-none ${isSelected ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                             <LatexText text={opt} />
                                         </span>
                                     </label>
                                 );
                             })}
                         </div>
                     )}

                     {q.question_type === 'written' && (
                         <div className="mt-3">
                            {attachments[q.id] ? (
                                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 group/img">
                                    <img src={attachments[q.id].startsWith('blob:') ? attachments[q.id] : `data:image/png;base64,${attachments[q.id].split(',').pop()}`} alt="Uploaded" className="w-full h-auto max-h-64 object-contain bg-gray-50 dark:bg-black" />
                                    <button 
                                        onClick={() => {
                                            if (attachments[q.id] && attachments[q.id].startsWith('blob:')) {
                                                URL.revokeObjectURL(attachments[q.id]);
                                            }
                                            setAttachments(prev => { const n = {...prev}; delete n[q.id]; return n; });
                                            setAttachmentFiles(prev => { const n = {...prev}; delete n[q.id]; return n; });
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                 <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-center bg-gray-50 dark:bg-white/5 transition-colors">
                                    <div className="relative flex flex-col items-center justify-center p-4 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer flex-1 w-full">
                                        <Upload size={24} className="text-gray-400 mb-2" />
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center">Upload from Gallery</span>
                                        <input 
                                            type="file" 
                                            accept="image/*, image/heic, image/heif"
                                            onClick={() => { isUploadingImageRef.current = true; }}
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(q.id, e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                        />
                                    </div>
                                    <div className="relative flex flex-col items-center justify-center p-4 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer flex-1 w-full">
                                        <Camera size={24} className="text-gray-400 mb-2" />
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center">Take Photo</span>
                                        <input 
                                            type="file" 
                                            accept="image/*, image/heic, image/heif"
                                            capture="environment"
                                            onClick={() => { isUploadingImageRef.current = true; }}
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(q.id, e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                        />
                                    </div>
                                 </div>
                            )}
                            <WrittenAnswerInput 
                                 questionId={q.id}
                                 initialValue={answers[q.id] || ''}
                                 onChange={handleAnswerChange}
                             />
                         </div>
                     )}
                 </div>
             ))}
          </div>
      </div>

      {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[24px] shadow-2xl max-w-sm w-full border border-gray-100 dark:border-white/10 transform scale-100 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 mx-auto">
                      <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-center text-[#1D1D1F] dark:text-white mb-2">এক্সাম সাবমিট করবেন?</h3>
                  <p className="text-center text-gray-500 text-sm mb-6">আপনি কি নিশ্চিত?</p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => !loading && setIsSubmitModalOpen(false)}
                          disabled={loading}
                          className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
                      >
                          ফিরে যান
                      </button>
                      <button 
                          onClick={() => submitExam(false)}
                          disabled={loading}
                          className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {loading ? <Loader2 className="animate-spin" size={18} /> : 'সাবমিট করুন'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Announcements Modal */}
      {showAnnouncements && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col border border-gray-100 dark:border-white/10">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                      <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                          <Megaphone size={20} className="text-orange-500" /> Announcements
                      </h3>
                      <button onClick={() => setShowAnnouncements(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                      {announcements.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 border border-dashed rounded-xl">No announcements yet</div>
                      ) : (
                          announcements.map((announcement) => (
                              <div key={announcement.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                  <h5 className="font-bold text-[#1D1D1F] dark:text-white text-sm mb-1">{announcement.title}</h5>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
                                  <span className="text-[10px] text-gray-400 mt-2 block flex items-center gap-1">
                                      <Clock size={10} />
                                      {new Date(announcement.created_at).toLocaleDateString()} at {new Date(announcement.created_at).toLocaleTimeString()}
                                  </span>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
