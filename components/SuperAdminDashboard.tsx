
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { 
    LayoutDashboard, Users, FileText, Activity, LogOut, 
    Search, Trash2, Edit, X,
    Plus, 
    CheckCircle2, AlertOctagon, Loader2, Eye,
    GraduationCap, 
    BarChart2, 
    Globe, Laptop, Sparkles, Type, Zap,
    FileQuestion, PenTool, Ban, ShieldAlert, Check, Globe2,
    ShieldCheck, RefreshCw, Mail, Calendar, ChevronDown, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  return '';
};

interface AdminProps {
    session: any;
    theme: string;
    toggleTheme: () => void;
}

const SuperAdminDashboard: React.FC<AdminProps> = ({ session, theme, toggleTheme }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'requests' | 'notifications'>('overview');
    const [loading, setLoading] = useState(false);
    
    // Data States
    const [stats, setStats] = useState({ teachers: 0, exams: 0, students: 0, submissions: 0 });
    const [teachersList, setTeachersList] = useState<any[]>([]);
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [domainRequests, setDomainRequests] = useState<any[]>([]);
    const [bannedStudents, setBannedStudents] = useState<Set<string>>(new Set()); 
    const [loadErrors, setLoadErrors] = useState<string[]>([]);
    
    // Search & Filter States
    const [teacherSearch, setTeacherSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    // Notification State
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifType, setNotifType] = useState('info');
    const [sendingNotif, setSendingNotif] = useState(false);
    const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
    const [editingNotification, setEditingNotification] = useState<any | null>(null);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editTier, setEditTier] = useState('free');
    const [updateLoading, setUpdateLoading] = useState(false);

    // Teacher Analytics Modal State
    const [selectedTeacherForAnalytics, setSelectedTeacherForAnalytics] = useState<any | null>(null);
    const [teacherBatchAnalytics, setTeacherBatchAnalytics] = useState<any[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setLoadErrors([]);
        
        try {
            // Optimized Fetching using new RPC for teachers
            const [teacherStatsResult, examsResult, submissionsResult, studentsTableResult, domainRequestsResult] = await Promise.all([
                supabase.rpc('get_super_admin_teacher_stats'), 
                supabase.from('exams').select('id, title, teacher_id, status, start_time'),
                supabase.from('student_submissions').select('id, student_roll, student_name, created_at, exam_id, obtained_marks, total_marks, ip_address'),
                supabase.from('students').select('*'), // Fetch persistent student records for ban status
                supabase.rpc('get_domain_requests') // UPDATED: Fetch ALL requests (pending/approved/rejected)
            ]);

            const newErrors: string[] = [];

            // 1. Handle Teachers (from RPC with Fallback)
            let teachersData = teacherStatsResult.data || [];
            
            if (teacherStatsResult.error) {
                console.warn("Teacher Stats RPC Failed (Using Fallback):", teacherStatsResult.error);
                
                // Fallback: Fetch raw profiles if stats function fails
                const { data: fallbackProfiles, error: fallbackError } = await supabase.from('profiles').select('*');
                
                if (fallbackProfiles) {
                    teachersData = fallbackProfiles.map((p: any) => ({
                        ...p,
                        total_exams: 0,
                        live_exams: 0,
                        ai_mcq_count: 0,
                        ai_written_count: 0,
                        manual_count: 0,
                        is_phantom: false // Default since column might be missing
                    }));
                    newErrors.push("Stats unavailable (DB Schema mismatch). Basic list loaded.");
                } else {
                    newErrors.push(`Critical Teacher Load Error: ${fallbackError?.message || teacherStatsResult.error.message}`);
                }
            }

            // 2. Handle Exams
            const exams = examsResult.data || [];
            
            // 3. Handle Submissions
            const submissions = submissionsResult.data || [];

            // 4. Handle Banned Students Map
            const studentsTable = studentsTableResult.data || [];
            const bannedSet = new Set<string>();
            const studentIdMap = new Map<string, string>(); // Map roll+teacher to DB ID

            studentsTable.forEach((s: any) => {
                const key = `${s.teacher_id}-${s.student_roll}`;
                studentIdMap.set(key, s.id);
                if (s.is_banned) {
                    bannedSet.add(key);
                }
            });
            setBannedStudents(bannedSet);

            // 5. Handle Domain Requests
            if (domainRequestsResult.data) {
                setDomainRequests(domainRequestsResult.data);
            }

            setLoadErrors(newErrors);
            setTeachersList(teachersData);

            // --- PROCESS STUDENT DATA ---
            const studentMap = new Map();
            const examMap = new Map(exams.map((e: any) => [e.id, e]));
            
            submissions.forEach((sub: any) => {
                const roll = sub.student_roll;
                if (!roll) return;
                
                const examDetails: any = examMap.get(sub.exam_id);
                const teacherId = examDetails?.teacher_id;
                
                // Composite key to uniquely identify student context
                const key = `${teacherId}-${roll}`; 
                
                const existing = studentMap.get(key);
                const subDate = new Date(sub.created_at).getTime();
                
                const enrichedSub = {
                    ...sub,
                    exam_title: examDetails?.title || 'Unknown Exam'
                };

                if (existing) {
                    existing.history.push(enrichedSub);
                    if (subDate > existing.last_active_ts) {
                        existing.last_active = sub.created_at;
                        existing.last_active_ts = subDate;
                        existing.last_ip = sub.ip_address;
                    }
                } else {
                    studentMap.set(key, {
                        roll: roll,
                        name: sub.student_name,
                        teacher_id: teacherId,
                        db_id: studentIdMap.get(key), // Persistent ID if exists
                        history: [enrichedSub],
                        last_active: sub.created_at,
                        last_active_ts: subDate,
                        last_ip: sub.ip_address,
                        is_banned: bannedSet.has(key)
                    });
                }
            });
            
            const processedStudents = Array.from(studentMap.values()).map((s:any) => ({
                ...s,
                exams_taken_count: s.history.length
            })).sort((a: any, b: any) => b.last_active_ts - a.last_active_ts);
            
            setStudentsList(processedStudents);

            setStats({
                teachers: teachersData.length,
                exams: exams.length,
                students: processedStudents.length,
                submissions: submissions.length
            });

        } catch (error: any) {
            console.error("Critical Dashboard Error:", error);
            toast.error("Dashboard crashed. See console.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBanTeacher = async (teacher: any) => {
        const newStatus = !teacher.is_banned;
        const action = newStatus ? "BAN" : "UNBAN";
        if (!confirm(`Are you sure you want to ${action} ${teacher.full_name}?`)) return;
        const { error } = await supabase.from('profiles').update({ is_banned: newStatus }).eq('id', teacher.id);
        if (error) toast.error("Failed."); else { toast.success("Success."); setTeachersList(prev => prev.map(t => t.id === teacher.id ? { ...t, is_banned: newStatus } : t)); }
    };
    
    const handleToggleBanStudent = async (student: any) => {
        const newStatus = !student.is_banned;
        const { error } = await supabase.from('students').upsert({
            teacher_id: student.teacher_id, student_roll: student.roll, student_name: student.name, is_banned: newStatus
        }, { onConflict: 'teacher_id,student_roll' });
        if (error) toast.error("Failed."); else {
            toast.success(newStatus ? "Banned" : "Unbanned");
            const key = `${student.teacher_id}-${student.roll}`;
            setBannedStudents(prev => { const next = new Set(prev); if (newStatus) next.add(key); else next.delete(key); return next; });
            setStudentsList(prev => prev.map(s => { if (s.teacher_id === student.teacher_id && s.roll === student.roll) return { ...s, is_banned: newStatus }; return s; }));
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault(); setCreateLoading(true);
        try {
            const tempSupabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
            const { data, error } = await tempSupabase.auth.signUp({ email: newUserEmail, password: newUserPassword, options: { data: { full_name: newUserName } } });
            if (error) throw error;
            await supabase.from('profiles').upsert({ id: data.user?.id, email: newUserEmail, full_name: newUserName, subscription_tier: 'free' });
            toast.success("User created!"); setIsCreateModalOpen(false); fetchDashboardData();
        } catch (error: any) { toast.error(error.message); } finally { setCreateLoading(false); }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Delete this teacher?")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) toast.error(error.message); else { toast.success("Deleted."); setTeachersList(prev => prev.filter(t => t.id !== userId)); }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editingUser) return; setUpdateLoading(true);
        const { error } = await supabase.from('profiles').update({ full_name: editName, subscription_tier: editTier }).eq('id', editingUser.id);
        if (error) toast.error("Failed."); else { toast.success("Updated."); setTeachersList(prev => prev.map(t => t.id === editingUser.id ? { ...t, full_name: editName, subscription_tier: editTier } : t)); setEditingUser(null); }
        setUpdateLoading(false);
    };

    const fetchTeacherAnalytics = async (teacher: any) => {
        setSelectedTeacherForAnalytics(teacher); setLoadingAnalytics(true); setTeacherBatchAnalytics([]);
        try {
            const { data } = await supabase.rpc('get_teacher_batch_analytics', { target_teacher_id: teacher.id });
            if (data) setTeacherBatchAnalytics(data);
        } catch (e) {} finally { setLoadingAnalytics(false); }
    };

    // --- DOMAIN REQUEST HANDLERS (UPDATED TO USE RPC) ---
    const approveDomain = async (batchId: number) => {
        const { error } = await supabase.rpc('approve_domain_request', { p_batch_id: batchId });
        if (error) {
            toast.error("Failed to approve: " + error.message);
        } else {
            toast.success("Domain Approved");
            // Update local state to 'approved' instead of removing
            setDomainRequests(prev => prev.map(r => r.id === batchId ? { ...r, domain_lock_status: 'approved' } : r));
        }
    };

    const rejectDomain = async (batchId: number) => {
        if (!confirm("Reject this domain request?")) return;
        const { error } = await supabase.rpc('reject_domain_request', { p_batch_id: batchId });
        if (error) {
            toast.error("Failed to reject: " + error.message);
        } else {
            toast.success("Domain Rejected");
            // Update local state to 'rejected' instead of removing
            setDomainRequests(prev => prev.map(r => r.id === batchId ? { ...r, domain_lock_status: 'rejected' } : r));
        }
    };

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setNotificationHistory(data);
    };

    useEffect(() => {
        if (activeTab === 'notifications') {
            fetchNotifications();
        }
    }, [activeTab]);

    const handleEditNotification = (notif: any) => {
        setEditingNotification(notif);
        setNotifTitle(notif.title);
        setNotifMessage(notif.message);
        setNotifType(notif.type);
    };

    const handleCancelEdit = () => {
        setEditingNotification(null);
        setNotifTitle('');
        setNotifMessage('');
        setNotifType('info');
    };

    const handleDeleteNotification = async (id: string) => {
        if (!confirm("Are you sure you want to delete this notification?")) return;
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete: " + error.message);
        } else {
            toast.success("Deleted successfully");
            setNotificationHistory(prev => prev.filter(n => n.id !== id));
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notifTitle || !notifMessage) return;
        setSendingNotif(true);
        try {
            if (editingNotification) {
                // Update existing
                const { error } = await supabase.from('notifications').update({
                    title: notifTitle,
                    message: notifMessage,
                    type: notifType
                }).eq('id', editingNotification.id);
                
                if (error) throw error;
                toast.success("Notification Updated!");
                setNotificationHistory(prev => prev.map(n => n.id === editingNotification.id ? { ...n, title: notifTitle, message: notifMessage, type: notifType } : n));
                handleCancelEdit();
            } else {
                // Create new
                const { data, error } = await supabase.from('notifications').insert({
                    title: notifTitle,
                    message: notifMessage,
                    type: notifType
                }).select();
                
                if (error) throw error;
                toast.success("Notification Sent!");
                if (data) setNotificationHistory(prev => [data[0], ...prev]);
                setNotifTitle('');
                setNotifMessage('');
                setNotifType('info');
            }
        } catch (error: any) {
            toast.error("Failed: " + error.message);
        } finally {
            setSendingNotif(false);
        }
    };

    // --- FILTERING ---
    const filteredTeachers = useMemo(() => teachersList.filter(t => 
        (t.full_name || '').toLowerCase().includes(teacherSearch.toLowerCase()) || 
        (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase())
    ), [teachersList, teacherSearch]);

    const filteredStudents = useMemo(() => studentsList.filter(s => 
        (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
        (s.roll || '').toLowerCase().includes(studentSearch.toLowerCase())
    ), [studentsList, studentSearch]);

    const filteredRequests = useMemo(() => {
        if (requestFilter === 'all') return domainRequests;
        return domainRequests.filter(r => r.domain_lock_status === requestFilter);
    }, [domainRequests, requestFilter]);

    // Count pending requests
    const pendingCount = domainRequests.filter(r => r.domain_lock_status === 'pending').length;

    // --- RENDER HELPERS ---
    const TierBadge = ({ tier }: { tier: string }) => {
        const t = (tier || 'free').toLowerCase();
        const style = t === 'enterprise' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : t === 'pro' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style}`}>{t}</span>;
    };

    const formatTokens = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    // Simplified Loading/Error Views (kept same as before)
    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-black"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-[#F8F9FA] dark:bg-black font-sans selection:bg-primary/30 text-[#111] dark:text-[#eee]">
            
            {/* SIDEBAR */}
            <aside className="w-72 bg-white dark:bg-[#0A0A0A] border-r border-gray-200 dark:border-white/5 flex flex-col z-20 shadow-xl shadow-gray-200/50 dark:shadow-none hidden lg:flex">
                <div className="p-8 pb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-lg shadow-black/20 dark:shadow-white/20">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight leading-none">Admin<span className="text-primary">Panel</span></h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Super User Access</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Menu</p>
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'teachers', label: 'Teachers', icon: Users },
                        { id: 'students', label: 'Students', icon: GraduationCap },
                        { id: 'requests', label: 'Requests', icon: Globe },
                        { id: 'notifications', label: 'Notifications', icon: Mail },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group relative overflow-hidden ${
                                activeTab === item.id 
                                ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                            }`}
                        >
                            <item.icon size={18} className={`transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {item.label}
                            {item.id === 'teachers' && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">{stats.teachers}</span>}
                            {item.id === 'requests' && pendingCount > 0 && (
                                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 m-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold">SA</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">Super Admin</p><p className="text-[10px] text-gray-500 truncate">{session?.user?.email}</p></div>
                    </div>
                    <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-black border border-gray-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all shadow-sm"><LogOut size={14} /> Sign Out</button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto relative custom-scrollbar">
                <header className="sticky top-0 z-30 bg-[#F8F9FA]/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 px-8 py-4 flex items-center justify-between">
                    <div><h2 className="text-2xl font-bold tracking-tight capitalize">{activeTab}</h2><p className="text-xs text-gray-500 font-medium mt-0.5">Manage your platform efficiently</p></div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-2.5 bg-white dark:bg-[#111] hover:bg-gray-50 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 shadow-sm"><Eye size={18} /></button>
                        <button onClick={() => { fetchDashboardData(); }} className="p-2.5 bg-white dark:bg-[#111] hover:bg-gray-50 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 shadow-sm"><RefreshCw size={18} /></button>
                    </div>
                </header>

                <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                    {/* Error Display */}
                    {loadErrors.length > 0 && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{loadErrors.join(', ')}</div>}

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                            {[
                                { label: 'Total Teachers', value: stats.teachers, icon: Users, color: 'text-blue-600' },
                                { label: 'Exams Created', value: stats.exams, icon: FileText, color: 'text-purple-600' },
                                { label: 'Active Students', value: stats.students, icon: Activity, color: 'text-orange-600' },
                                { label: 'Submissions', value: stats.submissions, icon: CheckCircle2, color: 'text-green-600' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-[#111] p-6 rounded-[28px] border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="flex justify-between items-start mb-4"><div className={`p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 ${stat.color}`}><stat.icon size={22} /></div></div>
                                    <h3 className="text-3xl font-black text-[#1D1D1F] dark:text-white">{stat.value}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <Globe2 size={24} className="text-primary" />
                                    <h3 className="text-lg font-bold dark:text-white">Domain Lock Requests</h3>
                                </div>
                                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                    {['all', 'pending', 'approved', 'rejected'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setRequestFilter(f as any)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${requestFilter === f ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-500'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {filteredRequests.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                                    <p className="text-gray-400">No requests found in this category.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {filteredRequests.map((req) => (
                                        <div key={req.id} className={`bg-white dark:bg-[#111] p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${req.domain_lock_status === 'pending' ? 'border-l-4 border-l-yellow-500 border-gray-100 dark:border-white/5' : req.domain_lock_status === 'approved' ? 'border-l-4 border-l-green-500 border-gray-100 dark:border-white/5 opacity-75 hover:opacity-100' : 'border-l-4 border-l-red-500 border-gray-100 dark:border-white/5 opacity-75 hover:opacity-100'}`}>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-lg font-bold text-[#1D1D1F] dark:text-white">{req.name}</h4>
                                                    {req.domain_lock_status === 'pending' && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase">Pending</span>}
                                                    {req.domain_lock_status === 'approved' && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Approved</span>}
                                                    {req.domain_lock_status === 'rejected' && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">Rejected</span>}
                                                </div>
                                                <div className="text-sm text-gray-500 space-y-1">
                                                    <p>Requested by: <strong>{req.teacher_name || 'Unknown'}</strong> ({req.teacher_email})</p>
                                                    <div className="flex items-center gap-2">
                                                        <Globe size={14} className="text-blue-500" />
                                                        <a href={`https://${req.allowed_domain}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono bg-blue-50 dark:bg-blue-900/10 px-1 rounded">{req.allowed_domain}</a>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Action Buttons only for Pending */}
                                            {req.domain_lock_status === 'pending' ? (
                                                <div className="flex gap-3">
                                                    <button onClick={() => rejectDomain(req.id)} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-2">
                                                        <X size={16} /> Reject
                                                    </button>
                                                    <button onClick={() => approveDomain(req.id)} className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors flex items-center gap-2 shadow-lg shadow-green-500/20">
                                                        <Check size={16} /> Approve
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Processed</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TEACHERS TAB (Repeated logic for display) */}
                    {activeTab === 'teachers' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="relative w-full md:w-96 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                                    <input type="text" placeholder="Search teachers..." value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 outline-none focus:border-primary/50 text-sm" />
                                </div>
                                <button onClick={() => setIsCreateModalOpen(true)} className="h-12 px-6 bg-primary text-white rounded-2xl font-bold shadow-lg flex items-center gap-2"><Plus size={18} /> <span className="hidden md:inline">Add Teacher</span></button>
                            </div>
                            <div className="bg-white dark:bg-[#111] rounded-[28px] shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-white/5 text-gray-400 text-[11px] font-bold uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                                                <th className="p-6">Teacher Details</th>
                                                <th className="p-6">Content Stats</th>
                                                <th className="p-6">Gemini Flash Tokens</th>
                                                <th className="p-6 text-center">Exams</th>
                                                <th className="p-6 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {filteredTeachers.map((t) => (
                                                <tr key={t.id} className={`hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group ${t.is_banned ? 'bg-red-50/50' : ''}`}>
                                                    <td className="p-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm relative">{t.full_name?.charAt(0).toUpperCase()}{t.is_banned && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"><Ban size={10} /></div>}</div><div><p className={`font-bold text-sm ${t.is_phantom ? 'text-red-500' : 'text-[#1D1D1F] dark:text-white'} flex items-center gap-2`}>{t.full_name}{t.is_banned && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-bold">Banned</span>}</p><div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5"><Mail size={10} /> {t.email}</div><div className="mt-1.5"><TierBadge tier={t.subscription_tier} /></div></div></div></td>
                                                    <td className="p-6"><div className="flex flex-col gap-2"><div className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded"><Sparkles size={12} /> {Number(t.ai_mcq_count||0) + Number(t.ai_written_count||0)} Total</div><div className="flex gap-2 text-[10px] text-gray-500 pl-1"><span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300"><FileQuestion size={10}/> MCQ: {t.ai_mcq_count||0}</span><span className="w-px h-3 bg-gray-300"></span><span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300"><PenTool size={10}/> Written: {t.ai_written_count||0}</span></div></div></td>
                                                    <td className="p-6"><div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 font-bold bg-yellow-50 dark:bg-yellow-900/10 px-2.5 py-1.5 rounded w-fit border border-yellow-100"><Zap size={12} className="text-yellow-600" /><span className="font-mono text-yellow-700">{formatTokens(t.total_ai_tokens||0)}</span></div><p className="text-[10px] text-gray-400 pl-1">Model: Gemini 2.5 Flash</p></div></td>
                                                    <td className="p-6 text-center"><div className="inline-flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100"><div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-bold">Total</p><p className="text-sm font-black">{t.total_exams||0}</p></div><div className="w-px h-6 bg-gray-200"></div><div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-bold">Live</p><p className="text-sm font-black text-green-600">{t.live_exams||0}</p></div></div></td>
                                                    <td className="p-6 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => handleToggleBanTeacher(t)} className={`p-2 border rounded-lg shadow-sm ${t.is_banned ? 'bg-red-100 text-red-600' : 'bg-white dark:bg-[#222] border-gray-200 dark:border-white/10'}`}><Ban size={16} /></button><button onClick={() => fetchTeacherAnalytics(t)} className="p-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg hover:text-primary"><BarChart2 size={16} /></button><button onClick={() => { setEditingUser(t); setEditName(t.full_name); setEditTier(t.subscription_tier || 'free'); }} className="p-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg hover:text-blue-500"><Edit size={16} /></button><button onClick={() => handleDeleteUser(t.id)} className="p-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button></div></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STUDENTS TAB (Repeated) */}
                    {activeTab === 'students' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="relative w-full md:w-96 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                                <input type="text" placeholder="Search by student..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 outline-none focus:border-primary/50 text-sm" />
                            </div>
                            <div className="bg-white dark:bg-[#111] rounded-[28px] shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-white/5 text-gray-400 text-[11px] font-bold uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                                            <th className="p-6 w-20 text-center">#</th>
                                            <th className="p-6">Student Info</th>
                                            <th className="p-6">Network</th>
                                            <th className="p-6 text-center">Exams Taken</th>
                                            <th className="p-6">Last Active</th>
                                            <th className="p-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {filteredStudents.map((student, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group ${student.is_banned ? 'bg-red-50/50' : ''}`}>
                                                <td className="p-6 text-center text-gray-400 font-bold text-xs">{idx + 1}</td>
                                                <td className="p-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs relative">{student.name?.charAt(0).toUpperCase()}{student.is_banned && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"><Ban size={10} /></div>}</div><div><h4 className="font-bold text-sm text-[#1D1D1F] dark:text-white">{student.name}</h4><span className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded mt-1 inline-block">Roll: {student.roll}</span></div></div></td>
                                                <td className="p-6">{student.last_ip ? <div className="flex items-center gap-2"><Laptop size={12} className="text-gray-400" /><span className="font-mono text-[10px] bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{student.last_ip}</span></div> : <span className="text-[10px] text-gray-400 italic">No IP</span>}</td>
                                                <td className="p-6 text-center"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-100"><FileText size={12} /> {student.exams_taken_count}</span></td>
                                                <td className="p-6"><p className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2"><Calendar size={12} className="text-gray-400" />{new Date(student.last_active).toLocaleDateString()}</p></td>
                                                <td className="p-6 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => handleToggleBanStudent(student)} className={`p-2 border rounded-lg shadow-sm ${student.is_banned ? 'bg-red-100 text-red-600' : 'bg-white dark:bg-[#222] border-gray-200 dark:border-white/10'}`}><Ban size={16} /></button></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in">
                            <div className="bg-white dark:bg-[#111] p-8 rounded-[32px] shadow-sm border border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">Broadcast Notification</h3>
                                        <p className="text-gray-500 text-sm">Send updates to all teachers.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSendNotification} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                                        <input 
                                            type="text" 
                                            value={notifTitle}
                                            onChange={e => setNotifTitle(e.target.value)}
                                            placeholder="e.g. System Update v2.0"
                                            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none focus:border-primary/50 transition-colors"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type</label>
                                        <div className="flex gap-3">
                                            {['info', 'warning', 'success', 'update'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setNotifType(t)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${notifType === t ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message</label>
                                        <textarea 
                                            value={notifMessage}
                                            onChange={e => setNotifMessage(e.target.value)}
                                            placeholder="Write your message here..."
                                            className="w-full h-32 p-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none focus:border-primary/50 transition-colors resize-none"
                                            required
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={sendingNotif}
                                        className={`w-full h-14 ${editingNotification ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary-dark'} text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2`}
                                    >
                                        {sendingNotif ? <Loader2 className="animate-spin" /> : editingNotification ? <Edit size={20} /> : <Send size={20} />}
                                        {editingNotification ? 'Update Notification' : 'Send Notification'}
                                    </button>
                                    
                                    {editingNotification && (
                                        <button 
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="w-full h-12 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                </form>
                            </div>

                            {/* Notification History */}
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-white mb-4">History</h3>
                                <div className="space-y-4">
                                    {notificationHistory.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No notifications sent yet.</p>
                                    ) : (
                                        notificationHistory.map((notif) => (
                                            <div key={notif.id} className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            notif.type === 'warning' ? 'bg-orange-100 text-orange-700' : 
                                                            notif.type === 'success' ? 'bg-green-100 text-green-700' : 
                                                            notif.type === 'update' ? 'bg-purple-100 text-purple-700' : 
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {notif.type}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{new Date(notif.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <h4 className="font-bold text-lg text-[#1D1D1F] dark:text-white mb-1">{notif.title}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{notif.message}</p>
                                                </div>
                                                <div className="flex items-center gap-2 self-start md:self-center">
                                                    <button 
                                                        onClick={() => handleEditNotification(notif)}
                                                        className="p-2 bg-gray-50 dark:bg-white/5 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteNotification(notif.id)}
                                                        className="p-2 bg-gray-50 dark:bg-white/5 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Modals (Repeated) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold dark:text-white">Add Teacher</h3><button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button></div>
                        <form onSubmit={handleCreateUser} className="space-y-5"><input type="text" placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none" /><input type="email" placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none" /><input type="password" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none" /><button type="submit" disabled={createLoading} className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2">{createLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}</button></form>
                    </div>
                </div>
            )}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 border border-gray-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-bold dark:text-white">Edit Profile</h3><button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button></div>
                        <form onSubmit={handleUpdateUser} className="space-y-5"><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none" /><div className="relative"><select value={editTier} onChange={e => setEditTier(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 outline-none appearance-none"><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div><button type="submit" disabled={updateLoading} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold flex items-center justify-center gap-2">{updateLoading ? <Loader2 className="animate-spin" /> : 'Update Profile'}</button></form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
