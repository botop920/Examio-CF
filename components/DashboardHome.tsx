
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Users, Clock, ArrowRight, Zap, Filter, Radio, Calendar, CheckCircle2, Trophy, Loader2, Bell, X, Info, AlertTriangle, Check, TrendingUp } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface DashboardHomeProps {
    onChangeTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onChangeTab }) => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<string[]>(['All']);
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Tab State for Exam List
  const [listTab, setListTab] = useState<'live' | 'upcoming' | 'history'>('live');
  
  // Stats State
  const [totalExams, setTotalExams] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState(0);
  const [liveExams, setLiveExams] = useState(0);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchData();
    fetchNotifications();
  }, []);
  
    // Auto-update exam statuses
    useEffect(() => {
        if (!exams.length) return;

        const checkExamStatuses = async () => {
            const now = new Date();
            const updates: Promise<any>[] = [];
            let changed = false;

            const newExams = exams.map(exam => {
                const startTime = exam.start_time ? new Date(exam.start_time) : null;
                const endTime = exam.end_time ? new Date(exam.end_time) : null;
                let newStatus = exam.status;

                if (exam.status === 'draft' && startTime && now >= startTime && (!endTime || now < endTime)) {
                    newStatus = 'published';
                }

                if (exam.status === 'published' && endTime && now >= endTime) {
                    newStatus = 'completed';
                }
                
                if (newStatus !== exam.status) {
                    changed = true;
                    updates.push(supabase.from('exams').update({ status: newStatus }).eq('id', exam.id));
                    return { ...exam, status: newStatus };
                }
                return exam;
            });

            if (changed) {
                setExams(newExams); // Optimistic update
                await Promise.all(updates).catch(err => {
                    console.error("Failed to auto-update exam statuses:", err);
                    // Optionally revert on failure by re-fetching
                });
            }
        };

        const intervalId = setInterval(checkExamStatuses, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [exams]);

  const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
          setNotifications(data);
          // Check unread
          const lastRead = localStorage.getItem('last_read_notif_time');
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
          const unread = data.filter((n: any) => new Date(n.created_at).getTime() > lastReadTime).length;
          setUnreadCount(unread);
      }
  };

  const handleOpenNotifications = () => {
      setShowNotifications(!showNotifications);
      if (!showNotifications && notifications.length > 0) {
          // Mark as read
          const latest = notifications[0];
          localStorage.setItem('last_read_notif_time', latest.created_at);
          setUnreadCount(0);
      }
  };

  const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Exams (All status)
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, student_submissions(count)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (!examError && examData) {
          setExams(examData);
      }

      // 2. Fetch Defined Batches (Filtered by teacher_id)
      const { data: batchData } = await supabase
        .from('batches')
        .select('name')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: true });
      
      if (batchData) {
          setBatches(['All', ...batchData.map(b => b.name).filter(b => b !== 'All')]);
      }

      setLoading(false);
  };

  // Filter Data by Batch
  const filteredExams = selectedBatch === 'All' 
    ? exams 
    : exams.filter(e => (e.batch || 'Unassigned') === selectedBatch);

  // Categorize Exams for Display
  const { liveList, upcomingList, historyList } = useMemo(() => {
      const now = new Date();
      const live: any[] = [];
      const upcoming: any[] = [];
      const history: any[] = [];

      for (const e of filteredExams) {
          const start = e.start_time ? new Date(e.start_time) : null;
          const end = e.end_time ? new Date(e.end_time) : null;

          const isLive = e.status === 'published' && (!start || start <= now) && (!end || end > now);
          const isUpcoming = (e.status === 'published' || e.status === 'draft') && start && start > now;
          const isHistory = e.status === 'completed' || (e.status === 'published' && end && end <= now);

          if (isLive) {
              live.push(e);
          } else if (isUpcoming) {
              upcoming.push(e);
          } else if (isHistory) {
              history.push(e);
          } else {
              // Catch-all for drafts without a future start_time
              history.push(e);
          }
      }
      return { liveList: live, upcomingList: upcoming, historyList: history };
  }, [filteredExams]);

  // Calculate Stats on the fly
  useEffect(() => {
     setTotalExams(filteredExams.length);
     setLiveExams(liveList.length);
     setUpcomingExams(upcomingList.length);
  }, [filteredExams, liveList, upcomingList]);

  // Get displayed list based on active tab
  const displayList = listTab === 'live' ? liveList : listTab === 'upcoming' ? upcomingList : historyList;

  const stats = [
    { label: 'চলমান এক্সাম (Live)', value: liveExams.toString(), icon: Radio, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'আসন্ন এক্সাম', value: upcomingExams.toString(), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'মোট এক্সাম', value: totalExams.toString(), icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse pb-20">
        {/* Welcome Banner Skeleton */}
        <div className="h-48 w-full bg-gray-200 dark:bg-white/5 rounded-[24px] relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
                        <div className="h-8 w-16 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                    </div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded"></div>
                </div>
            ))}
        </div>

        {/* List Skeleton */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-white/10 rounded"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-white/5 rounded"></div>
                </div>
                <div className="h-10 w-full md:w-80 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
            </div>
            <div className="p-0">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0"></div>
                            <div className="space-y-2 w-full">
                                <div className="h-5 w-3/4 md:w-64 bg-gray-200 dark:bg-white/10 rounded"></div>
                                <div className="flex gap-2">
                                    <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded"></div>
                                    <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded"></div>
                                    <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-lg shrink-0 self-end md:self-auto"></div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-[24px] p-8 text-white relative overflow-visible shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
         
         {/* Notification Bell (Absolute Top Right) */}
         <div className="absolute top-4 right-4 z-50">
             <div className="relative">
                 <button 
                    onClick={handleOpenNotifications}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors relative"
                 >
                     <Bell size={20} className="text-white" />
                     {unreadCount > 0 && (
                         <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-primary"></span>
                     )}
                 </button>

                 {/* Notification Dropdown */}
                 {showNotifications && (
                     <div className="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 origin-top-right z-[60]">
                         <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                             <h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm">Notifications</h4>
                             <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500">
                                 <X size={16} />
                             </button>
                         </div>
                         <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                             {notifications.length === 0 ? (
                                 <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                             ) : (
                                 notifications.map((n) => (
                                     <div key={n.id} className="p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                         <div className="flex gap-3">
                                             <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                                 ${n.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                                                   n.type === 'success' ? 'bg-green-100 text-green-600' : 
                                                   n.type === 'update' ? 'bg-purple-100 text-purple-600' : 
                                                   'bg-blue-100 text-blue-600'}`}
                                             >
                                                 {n.type === 'warning' ? <AlertTriangle size={14} /> : 
                                                  n.type === 'success' ? <Check size={14} /> : 
                                                  n.type === 'update' ? <Zap size={14} /> : 
                                                  <Info size={14} />}
                                             </div>
                                             <div>
                                                 <h5 className="font-bold text-sm text-[#1D1D1F] dark:text-white leading-tight mb-1">{n.title}</h5>
                                                 <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{n.message}</p>
                                                 <p className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(n.created_at).toLocaleDateString()}</p>
                                             </div>
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                     </div>
                 )}
             </div>
         </div>

         <div className="relative z-10">
             <h1 className="text-3xl font-bold mb-2">স্বাগতম, স্যার! 👋</h1>
             <p className="text-blue-100 max-w-xl mb-6 text-lg">
                আপনার পরবর্তী এক্সাম তৈরি করার জন্য আমাদের AI স্টুডিও প্রস্তুত।
             </p>
             <button 
                onClick={() => onChangeTab('studio')}
                className="bg-white text-primary px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg active:scale-95 w-full justify-center md:w-auto"
             >
                <Zap size={16} fill="currentColor" />
                নতুন এক্সাম তৈরি করুন
             </button>
             <button 
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-colors flex items-center gap-2 shadow-lg active:scale-95 w-full justify-center md:w-auto border border-white/20 ${showAnalytics ? 'bg-white text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
             >
                <TrendingUp size={16} />
                {showAnalytics ? 'Normal View' : 'Analytics Mode'}
             </button>
         </div>
         
         {/* Filter Dropdown inside Welcome Card */}
         <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 w-full md:w-auto min-w-[200px]">
             <label className="text-xs text-blue-100 uppercase font-bold tracking-wider mb-2 block">ব্যাচ ফিল্টার</label>
             <div className="flex items-center gap-2 bg-white text-primary px-3 py-2 rounded-lg font-bold">
                 <Filter size={14} />
                 <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="bg-transparent outline-none w-full cursor-pointer"
                 >
                     {batches.map(b => (
                         <option key={b} value={b} className="text-black">{b}</option>
                     ))}
                 </select>
             </div>
         </div>

         {/* Decorative circles */}
         <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
         <div className="absolute top-0 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {showAnalytics ? (
        <AnalyticsDashboard exams={exams} />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <span className="text-3xl font-bold text-[#1D1D1F] dark:text-white">{stat.value}</span>
                    </div>
                    <p className="text-[#86868B] font-medium">{stat.label}</p>
                </div>
            ))}
          </div>

          {/* Main Exam List Section */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
              {/* Header & Tabs */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">এক্সাম তালিকা</h3>
                      <p className="text-sm text-gray-500">আপনার তৈরি করা সকল এক্সাম এখানে দেখা যাবে।</p>
                  </div>
                  
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                      <button 
                        onClick={() => setListTab('live')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${listTab === 'live' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-500'}`}
                      >
                          <Radio size={14} className={listTab === 'live' ? 'animate-pulse' : ''} /> Live ({liveList.length})
                      </button>
                      <button 
                        onClick={() => setListTab('upcoming')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${listTab === 'upcoming' ? 'bg-white dark:bg-white/10 shadow-sm text-orange-500' : 'text-gray-500'}`}
                      >
                          <Calendar size={14} /> Upcoming ({upcomingList.length})
                      </button>
                      <button 
                        onClick={() => setListTab('history')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${listTab === 'history' ? 'bg-white dark:bg-white/10 shadow-sm text-gray-700 dark:text-white' : 'text-gray-500'}`}
                      >
                          <Clock size={14} /> History/Draft ({historyList.length})
                      </button>
                  </div>
              </div>

              {/* List Content */}
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {displayList.length === 0 ? (
                      <div className="text-center py-16">
                          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                              {listTab === 'live' ? <Radio size={32} /> : listTab === 'upcoming' ? <Calendar size={32} /> : <FileText size={32} />}
                          </div>
                          <p className="text-gray-500 font-medium">এই ক্যাটাগরিতে কোনো এক্সাম নেই।</p>
                      </div>
                  ) : (
                      displayList.map((exam) => (
                          <div key={exam.id} className="p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group cursor-pointer" onClick={() => onChangeTab('exams')}>
                              <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 
                                      ${listTab === 'live' ? 'bg-green-100 text-green-600' : 
                                        listTab === 'upcoming' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}
                                  `}>
                                      {exam.subject.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm md:text-base group-hover:text-primary transition-colors">
                                          {exam.title}
                                      </h4>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                          <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded uppercase">{exam.batch || 'Gen'}</span>
                                          <span className="text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                              <Clock size={10} /> {exam.duration_minutes}m
                                          </span>
                                          <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                              <Users size={10} /> {exam.student_submissions?.[0]?.count || 0}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-4 self-end md:self-auto">
                                  {listTab === 'live' && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> LIVE NOW
                                      </span>
                                  )}
                                  {listTab === 'upcoming' && exam.start_time && (
                                      <span className="text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">
                                          {new Date(exam.start_time).toLocaleString()}
                                      </span>
                                  )}
                                  <button className="p-2 text-gray-400 group-hover:text-primary transition-colors bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                                      <ArrowRight size={18} />
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-white/5 text-center border-t border-gray-100 dark:border-white/5">
                  <button 
                    onClick={() => onChangeTab('exams')} 
                    className="text-primary text-xs font-bold hover:underline"
                  >
                      View All Exams in Manager
                  </button>
              </div>
          </div>
        </>
      )}
    </div>
  );
};
