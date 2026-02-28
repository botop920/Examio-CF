
import React, { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '../lib/supabase';
import { X, Clock, CheckCircle2, AlertCircle, Upload, BookOpenCheck } from 'lucide-react';
import { LatexText } from './LatexText';

// Isolated timer component
const PreviewTimer = memo(({ duration, isSubmitted }: { duration: number, isSubmitted: boolean }) => {
    const [timeLeft, setTimeLeft] = useState(duration * 60);

    useEffect(() => {
        if(isSubmitted) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [isSubmitted]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-mono font-bold text-lg shadow-sm border border-transparent ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-white dark:bg-white/5 text-primary border-gray-100 dark:border-white/5'}`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
        </div>
    );
});
PreviewTimer.displayName = 'PreviewTimer';

interface StudentPreviewProps {
  exam: any;
  onClose: () => void;
}

export const StudentPreview: React.FC<StudentPreviewProps> = ({ exam, onClose }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false); // Simulation state
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    // Try sorting by ID first as it is safer if created_at is missing
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', exam.id)
      .order('id', { ascending: true }); // Changed from created_at to id
    
    if (error) {
        console.error("Error fetching questions:", error);
        setErrorMsg(error.message);
    }
    if (data) setQuestions(data);
    setLoading(false);
  };

  const handleFileUpload = (questionId: string) => {
      // Immediate feedback simulation (like in PublicExam)
      setAnswers({...answers, [questionId]: 'file_uploaded_mock.png'});
  };

  const handleAnswerSelect = (questionId: string, option: string) => {
      // Instant state update without loading/api call
      setAnswers(prev => ({...prev, [questionId]: option}));
  };

  const handleSubmit = () => {
      setIsSubmitted(true);
      alert("Exam Submitted! You can now view explanations.");
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
      <div className="fixed inset-0 z-[150] bg-white dark:bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[150] bg-[#F5F5F7] dark:bg-black flex flex-col animate-in fade-in duration-300 font-sans" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 h-20 z-50 px-6 md:px-10 flex items-center justify-between bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 bg-gray-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-full transition-all group">
            <X size={20} className="text-gray-500 dark:text-white group-hover:text-red-500" />
          </button>
          <div className="hidden md:block">
            <h3 className="font-bold text-lg text-[#1D1D1F] dark:text-white leading-tight">{exam.title}</h3>
            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest">{exam.subject} • {questions.length} Questions</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {!isSubmitted && (
             <PreviewTimer duration={exam.duration_minutes} isSubmitted={isSubmitted} />
          )}
          {isSubmitted ? (
             <div className="px-6 py-2 bg-green-100 text-green-700 font-bold rounded-full border border-green-200">
                 Result Mode
             </div>
          ) : (
            <button onClick={handleSubmit} className="bg-[#1D1D1F] dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">
                Submit
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-28 pb-32 px-4 md:px-8 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-2xl shadow-blue-900/20 mb-10 relative overflow-hidden">
             <div className="relative z-10">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{exam.title}</h1>
                <p className="opacity-80 mb-6 max-w-lg">
                    {isSubmitted ? 'Exam submitted successfully. Scroll down to review answers and explanations.' : 'Answer all questions carefully. Do not switch tabs. Good luck!'}
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest">
                    <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">Total Marks: {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">Type: {exam.type}</span>
                </div>
             </div>
             <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {errorMsg && (
             <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
                <div>
                   <h4 className="font-bold">Error Loading Questions</h4>
                   <p className="text-sm">{errorMsg}</p>
                   <p className="text-xs mt-1 opacity-70">Please run the SQL commands provided to fix database columns.</p>
                </div>
             </div>
          )}

          {!loading && !errorMsg && questions.length === 0 && (
              <div className="bg-white dark:bg-[#1C1C1E] p-10 rounded-3xl text-center shadow-sm border border-dashed border-gray-300 dark:border-white/10">
                  <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-white">কোনো প্রশ্ন পাওয়া যায়নি</h3>
                  <p className="text-gray-500 mt-2 max-w-md mx-auto">
                      প্রশ্ন অ্যাড করা হয়েছে কিনা অথবা RLS পারমিশন ঠিক আছে কিনা চেক করুন।
                  </p>
              </div>
          )}

          {questions.map((q, index) => {
             const userAnswer = answers[q.id];
             const isCorrect = userAnswer === q.correct_answer;
             
             return (
             <div key={q.id} id={`question-${index}`} onCopy={(e) => e.preventDefault()} className={`group bg-white dark:bg-[#1C1C1E] rounded-[24px] p-6 md:p-8 shadow-sm border transition-all ${isSubmitted ? (isCorrect ? 'border-green-200 dark:border-green-900/30' : 'border-red-200 dark:border-red-900/30') : 'border-gray-100 dark:border-white/5 hover:border-primary/20'}`}>
                 <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-sm text-gray-500">
                            {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mark: {q.marks || 1}</span>
                    </div>
                    {userAnswer && !isSubmitted && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={12} /> Answered
                        </span>
                    )}
                    {isSubmitted && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {isCorrect ? 'Correct' : 'Wrong'}
                        </span>
                    )}
                 </div>

                 <h3 className="text-xl md:text-2xl font-medium text-[#1D1D1F] dark:text-white mb-8 leading-normal">
                     <LatexText text={q.question_text} />
                 </h3>

                 {q.question_type === 'mcq' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options?.map((option: string, i: number) => {
                            const isSelected = userAnswer === option;
                            const isThisCorrect = option === q.correct_answer;
                            
                            // Style logic for result mode
                            let buttonStyle = 'bg-gray-5 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'; // Default
                            
                            if (!isSubmitted) {
                                if (isSelected) buttonStyle = 'bg-primary/5 border-primary shadow-inner';
                            } else {
                                if (isThisCorrect) {
                                    buttonStyle = 'bg-green-100 dark:bg-green-900/20 border-green-500 ring-1 ring-green-500';
                                } else if (isSelected && !isThisCorrect) {
                                    buttonStyle = 'bg-red-50 dark:bg-red-900/20 border-red-500';
                                } else {
                                    buttonStyle = 'opacity-50 grayscale';
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    disabled={isSubmitted}
                                    onClick={() => handleAnswerSelect(q.id, option)}
                                    className={`relative p-5 rounded-2xl text-left transition-all border ${buttonStyle}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors 
                                            ${!isSubmitted && isSelected ? 'border-primary bg-primary' : ''}
                                            ${isSubmitted && isThisCorrect ? 'border-green-500 bg-green-500' : ''}
                                            ${isSubmitted && isSelected && !isThisCorrect ? 'border-red-500 bg-red-500' : ''}
                                            ${!isSelected && !isSubmitted ? 'border-gray-300 dark:border-gray-600' : ''}
                                        `}>
                                            {(isSelected || (isSubmitted && isThisCorrect)) && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className={`text-base font-medium ${isSelected && !isSubmitted ? 'text-primary dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            <LatexText text={option} />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                     </div>
                 )}

                 {q.question_type === 'written' && (
                     <div className="mt-6">
                         <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => !isSubmitted && handleFileUpload(q.id)}>
                             {userAnswer ? (
                                 <div className="flex flex-col items-center gap-3">
                                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                        <CheckCircle2 size={32} />
                                     </div>
                                     <p className="font-bold text-green-600">Answer Script Uploaded</p>
                                     {!isSubmitted && <p className="text-xs text-gray-400">Click to replace</p>}
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                        <Upload size={24} />
                                    </div>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-200">Upload Answer Script</h4>
                                    <p className="text-sm text-gray-400 max-w-xs">Take a photo of your notebook and upload it here. Supported: JPG, PNG, PDF</p>
                                    {!isSubmitted && <button className="mt-4 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold">Choose File</button>}
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
                 
                 {/* Explanation Section - Only visible after submission */}
                 {isSubmitted && q.explanation && (
                     <div className="mt-6 p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-bold text-sm uppercase tracking-wide">
                            <BookOpenCheck size={16} />
                            Explanation
                        </div>
                        <div className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed overflow-x-auto">
                            <LatexText text={q.explanation} />
                        </div>
                     </div>
                 )}
             </div>
          )})}
        </div>
      </main>

      {/* Progress Bar */}
      {!isSubmitted && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-gray-200 dark:border-white/10 z-[160] flex items-center gap-4">
             <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Progress</span>
                 <div className="w-32 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-green-500 transition-all duration-500" 
                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} 
                     />
                 </div>
             </div>
             <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
             <span className="font-bold text-sm text-[#1D1D1F] dark:text-white">
                 {Object.keys(answers).length} <span className="text-gray-400">/ {questions.length}</span>
             </span>
          </div>
      )}
    </div>
  );
};
