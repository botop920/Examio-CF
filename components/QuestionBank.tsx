
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Trash2, Library, Loader2 } from 'lucide-react';
import { LatexText } from './LatexText';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(['All']);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastQuestionRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Fetch subjects for filter dropdown
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('question_bank')
        .select('subject')
        .eq('teacher_id', user.id);
        
      if (data) {
        const unique = Array.from(new Set(data.map((item: any) => item.subject).filter(Boolean))) as string[];
        setAvailableSubjects(['All', ...unique.filter(s => s !== 'All')]);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch questions when page changes
  useEffect(() => {
    if (page > 0) {
      fetchQuestions(page, false);
    }
  }, [page]);

  // Reset and fetch when filters change
  useEffect(() => {
    setQuestions([]);
    setPage(0);
    setHasMore(true);
    fetchQuestions(0, true);
  }, [searchTerm, selectedSubject]);

  const fetchQuestions = async (pageParam: number, isRefresh: boolean) => {
    if (isRefresh) setLoading(true);
    else setLoadingMore(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('question_bank')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (selectedSubject !== 'All') {
      query = query.eq('subject', selectedSubject);
    }

    if (searchTerm) {
      query = query.or(`question_text.ilike.%${searchTerm}%,topic.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setQuestions(prev => isRefresh ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      console.error(error);
      toast.error('Error loading questions');
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const deleteQuestion = async (id: number) => {
      if(!confirm("আপনি কি নিশ্চিত?")) return;
      
      const previousQuestions = [...questions];
      setQuestions(questions.filter(q => q.id !== id));

      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      
      if(error) {
          setQuestions(previousQuestions);
          toast.error("Failed to delete");
      } else {
          toast.success("Deleted successfully");
      }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
               <h2 className="text-xl md:text-2xl font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                   <Library className="text-primary" size={24} /> কোয়েশ্চেন ব্যাংক (হিস্ট্রি)
               </h2>
               <p className="text-gray-500 text-xs md:text-sm mt-1">আগে জেনারেট করা সকল প্রশ্ন এখানে সংরক্ষিত আছে।</p>
           </div>
       </div>

       <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl flex flex-col md:flex-row gap-3 shadow-sm border border-gray-100 dark:border-white/5 sticky top-0 z-10 backdrop-blur-md bg-white/90 dark:bg-[#1C1C1E]/90">
           <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2.5 rounded-xl border border-transparent focus-within:border-primary transition-colors">
               <Search size={18} className="text-gray-400 shrink-0" />
               <input 
                 type="text" 
                 placeholder="প্রশ্ন বা টপিক খুঁজুন..." 
                 className="bg-transparent outline-none w-full text-sm text-[#1D1D1F] dark:text-white placeholder:text-gray-400"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
           </div>
           <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2.5 rounded-xl w-full md:w-48 border border-transparent focus-within:border-primary">
               <Filter size={16} className="text-gray-400 shrink-0" />
               <select 
                 className="bg-transparent outline-none w-full text-sm text-[#1D1D1F] dark:text-white cursor-pointer"
                 value={selectedSubject}
                 onChange={e => setSelectedSubject(e.target.value)}
               >
                   {availableSubjects.map(s => <option key={s} value={s} className="text-black bg-white">{s}</option>)}
               </select>
           </div>
       </div>

       <div className="grid gap-3">
           {loading ? (
               <div className="space-y-3">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-32 bg-white dark:bg-[#1C1C1E] rounded-xl border border-gray-200 dark:border-white/5 p-4 animate-pulse">
                            <div className="flex gap-4">
                               <div className="flex-1 space-y-3">
                                  <div className="flex gap-2">
                                      <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded"></div>
                                      <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded"></div>
                                  </div>
                                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-white/5 rounded"></div>
                                  <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/5 rounded"></div>
                               </div>
                            </div>
                        </div>
                    ))}
               </div>
           ) : questions.length === 0 ? (
               <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
                   <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <Search size={24} />
                   </div>
                   <p className="text-gray-500 font-medium text-sm">কোনো প্রশ্ন পাওয়া যায়নি</p>
               </div>
           ) : (
               questions.map((q, index) => {
                   const isLastElement = index === questions.length - 1;
                   return (
                       <div 
                           key={q.id} 
                           ref={isLastElement ? lastQuestionRef : null}
                           className="bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-primary/20 transition-colors group shadow-sm"
                       >
                           <div className="flex gap-4">
                               <div className="flex-1 min-w-0">
                                   <div className="flex flex-wrap gap-2 mb-3">
                                       <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-md uppercase tracking-wider">
                                           {q.subject}
                                       </span>
                                       {q.topic && (
                                           <span className="text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-1 rounded-md line-clamp-1 max-w-[150px]">
                                               {q.topic}
                                           </span>
                                       )}
                                       <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-md uppercase tracking-wider">
                                           {q.question_type}
                                       </span>
                                   </div>
                                   
                                   <div className="text-[#1D1D1F] dark:text-white font-semibold text-base md:text-lg leading-relaxed mb-3 break-words overflow-x-auto">
                                       <LatexText text={q.question_text} />
                                   </div>
                                   
                                   {q.question_type === 'mcq' && (
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                           {q.options?.map((opt: string, i: number) => (
                                               <div key={i} className={`text-xs md:text-sm px-3 py-2 rounded-lg flex items-start gap-2 border ${opt === q.correct_answer ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-600 dark:text-gray-300'}`}>
                                                   <span className="font-bold opacity-70 shrink-0 mt-0.5">{String.fromCharCode(65+i)}.</span>
                                                   <span className="break-words"><LatexText text={opt} /></span>
                                               </div>
                                           ))}
                                       </div>
                                   )}
                                   
                                   {q.explanation && (
                                       <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                           <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Explanation</p>
                                           <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed break-words overflow-x-auto"><LatexText text={q.explanation} /></div>
                                       </div>
                                   )}
                               </div>
                               
                               <button 
                                 onClick={() => deleteQuestion(q.id)}
                                 className="p-2 h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0"
                                 title="Delete"
                               >
                                   <Trash2 size={18} />
                               </button>
                           </div>
                       </div>
                   );
               })
           )}
           
           {loadingMore && (
               <div className="py-6 flex justify-center">
                   <Loader2 className="animate-spin text-primary" size={24} />
               </div>
           )}
           
           {!hasMore && questions.length > 0 && (
               <div className="py-6 text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
                   End of List
               </div>
           )}
       </div>
    </div>
  );
};
