
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileSignature, Search, ChevronRight, CheckCircle2, AlertCircle, Eye, Bot, Save, Loader2, ArrowLeft, Clock, Users, ArrowDownCircle } from 'lucide-react';
import { LatexText } from './LatexText';
import toast from 'react-hot-toast';

export const WrittenGrading: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opLoading, setOpLoading] = useState(false); // New operational loading state
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [pendingScripts, setPendingScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  
  // Grading State
  const [marks, setMarks] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch exams that are Written type with submission count
    const { data } = await supabase
      .from('exams')
      .select('*, student_submissions(count)')
      .eq('teacher_id', user.id)
      .eq('type', 'written')
      .order('created_at', { ascending: false });

    if (data) setExams(data);
    setLoading(false);
  };

  const fetchScripts = async (exam: any) => {
    setOpLoading(true);
    setSelectedExam(exam);
    // Fetch submissions for this exam
    const { data } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('exam_id', exam.id)
      .order('created_at', { ascending: false });
    
    if (data) setPendingScripts(data);
    setOpLoading(false);
  };

  const openScript = async (script: any) => {
    setOpLoading(true); // Start loading
    setMarks({}); // Clear previous marks
    
    // Fetch answers linked to this submission
    const { data, error } = await supabase
      .from('student_answers')
      .select(`*, questions(*)`)
      .eq('submission_id', script.id);
    
    if (error) {
        console.error(error);
        toast.error("Error loading script");
        setOpLoading(false);
        return;
    }

    if (data) {
        // Safe filter: check if questions object exists (join successful)
        const writtenAnswers = data.filter((a: any) => a.questions && a.questions.question_type === 'written');
        
        // Init marks locally
        const m: Record<string, number> = {};
        writtenAnswers.forEach((a: any) => {
            if (a.marks_obtained !== null) {
                m[a.id] = a.marks_obtained;
            }
        });
        setMarks(m);

        // Finally set the script with populated answers to trigger view switch
        setSelectedScript({ ...script, answers: writtenAnswers });
    }
    setOpLoading(false);
  };

  const saveGrading = async () => {
    if (!selectedScript) return;
    setOpLoading(true);
    
    try {
        // Update marks for each answer individually to catch errors
        // Using Promise.all with explicit error checking inside map
        const updatePromises = Object.keys(marks).map(async (ansId) => {
            const { error } = await supabase
                .from('student_answers')
                .update({ marks_obtained: marks[ansId] })
                .eq('id', ansId);
            
            if (error) throw error; // Will be caught by catch block
        });

        await Promise.all(updatePromises);

        // Recalculate total by fetching ALL answers (including MCQ which are already graded)
        const { data: allAnswers, error: fetchError } = await supabase
            .from('student_answers')
            .select('marks_obtained')
            .eq('submission_id', selectedScript.id);
            
        if (fetchError) throw fetchError;

        const total = allAnswers?.reduce((sum: number, a: any) => sum + (Number(a.marks_obtained) || 0), 0) || 0;

        const { error: subError } = await supabase
            .from('student_submissions')
            .update({ obtained_marks: total, status: 'checked' })
            .eq('id', selectedScript.id);

        if (subError) throw subError;
        
        toast.success("Marks saved successfully");
        
        // Refresh the pending scripts list in background
        if (selectedExam) {
            const { data } = await supabase
                .from('student_submissions')
                .select('*')
                .eq('exam_id', selectedExam.id)
                .order('created_at', { ascending: false });
            if(data) setPendingScripts(data);
        }

        setSelectedScript(null);
    } catch (e: any) {
        console.error("Save Error:", e);
        toast.error(`Failed to save: ${e.message || "Permission denied or network error"}`);
    } finally {
        setOpLoading(false);
    }
  };

  // 1. DETAIL VIEW (Script Grading)
  if (selectedScript) {
      return (
          <div className="space-y-6 animate-in slide-in-from-right">
              <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedScript(null)} className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <ArrowLeft size={16} /> Back to List
                  </button>
                  <button onClick={saveGrading} disabled={opLoading} className="bg-primary text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50">
                      {opLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Grades
                  </button>
              </div>
              
              <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                          <h2 className="text-2xl font-bold dark:text-white">{selectedScript.student_name}</h2>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>Roll: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{selectedScript.student_roll}</span></span>
                              <span>•</span>
                              <span>Time: {new Date(selectedScript.created_at).toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="text-right">
                           <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Current Written Total</div>
                           <div className="text-3xl font-black text-primary">{Object.values(marks).reduce((a: number, b: number) => a + (b || 0), 0)}</div>
                      </div>
                  </div>
              </div>

              <div className="space-y-8">
                  {selectedScript.answers.map((ans: any, idx: number) => {
                      const aiFeedback = ans.ai_feedback ? JSON.parse(ans.ai_feedback) : null;
                      return (
                          <div key={ans.id} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-50 dark:border-white/5">
                                  <div className="flex gap-3">
                                      <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-sm text-gray-500">{idx+1}</span>
                                      <div>
                                          <h4 className="font-bold text-lg dark:text-white leading-snug"><LatexText text={ans.questions.question_text} /></h4>
                                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1 block">Max Marks: {ans.questions.marks}</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex flex-col xl:flex-row gap-8">
                                  {/* Answer Content */}
                                  <div className="flex-1 min-w-0">
                                      {ans.attachment_url ? (
                                          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                                             <img 
                                                src={ans.attachment_url.startsWith('http') ? ans.attachment_url : `data:image/png;base64,${ans.attachment_url.split(',').pop()}`}
                                                className="w-full h-auto object-contain max-h-[600px]" 
                                                alt="Student Answer" 
                                              />
                                          </div>
                                      ) : (
                                          <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-xl text-center border border-dashed border-gray-200 dark:border-white/10 text-gray-400 italic">
                                              No image uploaded
                                          </div>
                                      )}
                                      
                                      {ans.text_answer && (
                                          <div className="mt-4">
                                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Text Answer:</p>
                                              <p className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl dark:text-white whitespace-pre-wrap text-sm border border-gray-100 dark:border-white/5">{ans.text_answer}</p>
                                          </div>
                                      )}
                                  </div>

                                  {/* Grading Controls */}
                                  <div className="w-full xl:w-80 space-y-4 shrink-0">
                                      {/* AI Section */}
                                      {aiFeedback && (
                                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                              <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                                  <Bot size={16} /> AI Feedback
                                              </div>
                                              <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-3 leading-relaxed">{aiFeedback.feedback}</p>
                                              <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-900/30">
                                                  <div>
                                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase block">Suggested</span>
                                                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{aiFeedback.marks}</span>
                                                  </div>
                                                  <button 
                                                    onClick={() => setMarks(prev => ({...prev, [ans.id]: Number(aiFeedback.marks)}))}
                                                    className="flex items-center gap-1 bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all border border-indigo-100 dark:border-indigo-900/20"
                                                  >
                                                      Apply <ArrowDownCircle size={14} />
                                                  </button>
                                              </div>
                                          </div>
                                      )}

                                      {/* Manual Grading */}
                                      <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                          <label className="text-xs font-bold text-gray-400 uppercase mb-3 block flex justify-between">
                                              <span>Teacher Marks</span>
                                              <span>Max: {ans.questions.marks}</span>
                                          </label>
                                          <div className="flex items-center gap-2">
                                              <input 
                                                  type="number" 
                                                  value={marks[ans.id] ?? ''}
                                                  placeholder="0"
                                                  onChange={(e) => {
                                                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                      if (val === '' || (val >= 0 && val <= (ans.questions.marks || 100))) {
                                                          // @ts-ignore
                                                          setMarks({...marks, [ans.id]: val});
                                                      }
                                                  }}
                                                  className="w-full h-12 px-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black text-2xl font-bold text-center outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                              />
                                          </div>
                                      </div>
                                      
                                      {ans.is_manual_review_requested && (
                                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                              <AlertCircle size={16} />
                                              <span>Student requested review</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // 2. LIST OF SCRIPTS VIEW
  if (selectedExam) {
      return (
          <div className="space-y-6 animate-in fade-in">
              <button onClick={() => setSelectedExam(null)} className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <ArrowLeft size={16} /> Back to Exams
              </button>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h2 className="text-2xl font-bold dark:text-white">{selectedExam.title} - খাতা মূল্যায়ন</h2>
                      <p className="text-gray-500 text-sm mt-1">{selectedExam.subject} • Total Submissions: {pendingScripts.length}</p>
                  </div>
              </div>
              
              {opLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="space-y-2 w-full">
                                      <div className="h-5 w-1/2 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                                      <div className="h-3 w-1/3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                                  </div>
                                  <div className="w-6 h-6 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
                              </div>
                              <div className="flex justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                                  <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                                  <div className="h-5 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : pendingScripts.length === 0 ? (
                   <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                      <p className="text-gray-400">কোনো খাতা জমা পড়েনি</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingScripts.map(script => (
                          <div key={script.id} onClick={() => openScript(script)} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-4 group relative overflow-hidden">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h4 className="font-bold text-lg dark:text-white group-hover:text-primary transition-colors">{script.student_name}</h4>
                                      <p className="text-sm text-gray-500 font-mono mt-0.5">Roll: {script.student_roll}</p>
                                  </div>
                                  <ChevronRight className="text-gray-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                              </div>
                              
                              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                                  <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                      <Clock size={12} />
                                      {new Date(script.created_at).toLocaleDateString()}
                                  </div>
                                  {script.status === 'checked' ? (
                                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded flex items-center gap-1">
                                          <CheckCircle2 size={12} /> Checked
                                      </span>
                                  ) : (
                                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded flex items-center gap-1">
                                          <AlertCircle size={12} /> Pending
                                      </span>
                                  )}
                              </div>
                              {/* Hover Effect Bar */}
                              <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-300"></div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  }

  // 3. MAIN LIST OF EXAMS
  return (
    <div className="space-y-6 animate-in fade-in">
       <div>
           <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
               <FileSignature className="text-primary" /> লিখিত খাতা মূল্যায়ন
           </h2>
           <p className="text-gray-500 text-sm">শুধুমাত্র লিখিত পরীক্ষার খাতাগুলো এখানে দেখাবে।</p>
       </div>

       {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1, 2, 3, 4, 5, 6].map((i) => (
                   <div key={i} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                       <div className="flex justify-between mb-4">
                           <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse"></div>
                           <div className="w-16 h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                       </div>
                       <div className="h-6 w-3/4 bg-gray-200 dark:bg-white/10 rounded mb-2 animate-pulse"></div>
                       <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/10 rounded mb-4 animate-pulse"></div>
                       <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex justify-between">
                           <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
                           <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
                       </div>
                   </div>
               ))}
           </div>
       ) : exams.length === 0 ? (
           <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-xl border border-dashed border-gray-300 dark:border-white/10">
               <p className="text-gray-400">কোনো লিখিত পরীক্ষা পাওয়া যায়নি</p>
           </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {exams.map(exam => {
                   const submissionCount = exam.student_submissions?.[0]?.count || 0;
                   return (
                       <div key={exam.id} onClick={() => fetchScripts(exam)} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group border border-transparent hover:border-primary/20 relative overflow-hidden">
                           <div className="flex items-start justify-between mb-4">
                               <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/10 rounded-xl flex items-center justify-center text-pink-500">
                                   <FileSignature size={24} />
                               </div>
                               <div className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-gray-500 uppercase">
                                   {exam.batch || 'Gen'}
                               </div>
                           </div>
                           
                           <h3 className="font-bold text-lg dark:text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">{exam.title}</h3>
                           <p className="text-sm text-gray-500">{exam.subject} • {exam.duration_minutes} min</p>
                           
                           <div className="mt-3 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold">
                                    <Users size={12} /> {submissionCount} জন জমা দিয়েছে
                                </span>
                           </div>

                           <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex justify-between items-center">
                               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">View Scripts</span>
                               <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all">
                                   <ChevronRight size={16} />
                               </div>
                           </div>
                       </div>
                   );
               })}
           </div>
       )}
    </div>
  );
};
