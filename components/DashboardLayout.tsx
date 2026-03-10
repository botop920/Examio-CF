
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Sparkles, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  Library,
  FileSignature,
  FileBarChart,
  MessageSquare
} from 'lucide-react';
import { DashboardHome } from './DashboardHome';
import { ExamStudio } from './ExamStudio';
import { ExamList } from './ExamList';
import { TeacherProfile } from './TeacherProfile';
import { QuestionBank } from './QuestionBank';
import { ExamResults } from './ExamResults';
import { WrittenGrading } from './WrittenGrading';
import { OmrScanner } from './OmrScanner';

const LOGO_LIGHT = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1770135336/IMG_2585_tiorhy.png";
const LOGO_DARK = "https://res.cloudinary.com/dejm7pz1d/image/upload/v1770135335/IMG_2584_bjqgp4.png";

interface DashboardLayoutProps {
  session: any;
  theme: string;
  toggleTheme: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ session, theme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'studio' | 'exams' | 'bank' | 'profile' | 'results' | 'grading' | 'parents_sms' | 'omr'>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedResultExamId, setSelectedResultExamId] = useState<string | null>(null);
  const [omrExamId, setOmrExamId] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleViewResults = (examId: string) => {
      setSelectedResultExamId(examId);
      setActiveTab('results');
  };

  const handleViewOmr = (examId: string) => {
      setOmrExamId(examId);
      setActiveTab('omr');
  };

  const menuItems = [
    { id: 'home', label: 'ওভারভিউ', icon: LayoutDashboard },
    { id: 'studio', label: 'AI এক্সাম স্টুডিও', icon: Sparkles },
    { id: 'exams', label: 'আমার এক্সাম', icon: FileText },
    { id: 'grading', label: 'লিখিত খাতা', icon: FileSignature },
    { id: 'bank', label: 'কোয়েশ্চেন ব্যাংক', icon: Library },
    { id: 'parents_sms', label: 'Parents SMS', icon: MessageSquare },
    { id: 'profile', label: 'প্রোফাইল', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardHome onChangeTab={(tab) => setActiveTab(tab as any)} userId={session?.user?.id} />;
      case 'studio':
        return <ExamStudio onExamCreated={() => setActiveTab('exams')} />;
      case 'exams':
        return <ExamList onViewResults={handleViewResults} onViewOmr={handleViewOmr} userId={session?.user?.id} />;
      case 'grading':
        return <WrittenGrading />;
      case 'omr':
        return <OmrScanner initialExamId={omrExamId} onBack={() => setActiveTab('exams')} />;
      case 'bank':
        return <QuestionBank />;
      case 'parents_sms':
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/20">
                    <MessageSquare size={48} />
                </div>
                <h2 className="text-4xl font-bold text-[#1D1D1F] dark:text-white mb-3">Parents SMS</h2>
                <div className="px-4 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    Coming Soon
                </div>
                <p className="text-gray-500 text-lg max-w-md leading-relaxed">
                    অভিভাবকদের অটোমেটিক SMS পাঠানোর ফিচারটি খুব শীঘ্রই আসছে। পরীক্ষার ফলাফল এবং উপস্থিতির নোটিফিকেশন পাঠানো যাবে এক ক্লিকে।
                </p>
            </div>
        );
      case 'profile':
        return <TeacherProfile session={session} />;
      case 'results':
        return selectedResultExamId ? (
            <ExamResults 
                examId={selectedResultExamId} 
                onBack={() => setActiveTab('exams')} 
            />
        ) : <ExamList onViewResults={handleViewResults} onViewOmr={handleViewOmr} />;
      default:
        return <DashboardHome onChangeTab={(tab) => setActiveTab(tab as any)} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] dark:bg-black overflow-hidden transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-50 w-64 h-full bg-white dark:bg-[#1C1C1E] border-r border-gray-200 dark:border-white/10 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
             <img 
                src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} 
                alt="EXAMiO" 
                className="h-8 w-auto object-contain mb-2"
             />
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Teacher Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
            {menuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id as any);
                        setSidebarOpen(false);
                        if (item.id !== 'results') setSelectedResultExamId(null);
                        if (item.id !== 'omr') setOmrExamId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm
                        ${activeTab === item.id 
                            ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1D1D1F] dark:hover:text-white'
                        }
                    `}
                >
                    <item.icon size={20} />
                    <span className="flex items-center gap-2">
                        {item.label}
                        {item.id === 'grading' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                Beta
                            </span>
                        )}
                        {item.id === 'parents_sms' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
                                New
                            </span>
                        )}
                    </span>
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-3">
             <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {session.user.email?.[0].toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                     <p className="text-sm font-bold text-[#1D1D1F] dark:text-white truncate">{session.user.user_metadata?.full_name || 'Teacher'}</p>
                     <p className="text-[10px] text-gray-500 truncate">{session.user.email}</p>
                 </div>
             </div>

             <div className="flex gap-2">
                 <button 
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/5 text-[#1D1D1F] dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                 >
                     {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Theme
                 </button>
                 <button 
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                 >
                     <LogOut size={16} /> Logout
                 </button>
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Mobile Header */}
          <header className="md:hidden h-16 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 z-30 shrink-0">
               <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-[#1D1D1F] dark:text-white"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg text-[#1D1D1F] dark:text-white">
                        {activeTab === 'home' ? 'Overview' : 
                         activeTab === 'studio' ? 'Exam Studio' : 
                         activeTab === 'exams' ? 'My Exams' :
                         activeTab === 'grading' ? 'Written Grading' :
                         activeTab === 'bank' ? 'Question Bank' :
                         activeTab === 'parents_sms' ? 'Parents SMS' :
                         activeTab === 'omr' ? 'OMR Scanner' :
                         activeTab === 'profile' ? 'Profile' : 'Results'}
                    </span>
               </div>
               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {session.user.email?.[0].toUpperCase()}
               </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8">
               {renderContent()}
          </div>
      </main>
    </div>
  );
};
