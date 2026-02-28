
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, CheckCircle2, Clock, Eye, Save, AlertCircle, X, Trophy, Medal, Crown, TrendingUp, Download, Loader2 } from 'lucide-react';
import { LatexText } from './LatexText';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface ExamResultsProps {
  examId: string;
  onBack: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({ examId, onBack }) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxScore, setMaxScore] = useState(0);
  
  // PDF Downloading State
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadConfig, setDownloadConfig] = useState({
      rank: true,
      correct: true,
      wrong: true,
      negative: true,
      timeTaken: true,
      total: true
  });

  // Detail View State
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Grading State
  const [manualMarks, setManualMarks] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSubmissions();
  }, [examId]);

  const fetchSubmissions = async () => {
    // Get Exam Title
    const { data: eData } = await supabase.from('exams').select('title').eq('id', examId).single();
    if(eData) setExamTitle(eData.title);

    const { data, error } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('exam_id', examId)
      .order('obtained_marks', { ascending: false });

    if (!error && data) {
      setSubmissions(data);
      // Calculate max obtained score for progress bars
      const max = Math.max(...data.map((s: any) => s.obtained_marks || 0));
      setMaxScore(max > 0 ? max : 1);
    }
    setLoading(false);
  };

  const downloadResultSheet = async () => {
      if (submissions.length === 0) {
          toast.error("No submissions to download");
          return;
      }

      setIsDownloading(true);
      setShowDownloadModal(false); // Close modal
      const toastId = toast.loading("Generating Result Sheet...");

      try {
          // 1. Fetch Exam Details
          const { data: examData } = await supabase
              .from('exams')
              .select('title, negative_marking, total_marks, duration_minutes')
              .eq('id', examId)
              .single();
          
          const negativeRate = Number(examData?.negative_marking || 0);

          // 2. Fetch ALL Answers for ALL submissions
          const submissionIds = submissions.map(s => s.id);
          
          const { data: allAnswers, error } = await supabase
              .from('student_answers')
              .select('submission_id, is_correct, marks_obtained, selected_option')
              .in('submission_id', submissionIds);

          if (error) throw error;

          // 3. Aggregate Data
          const statsMap: Record<string, { correct: number, wrong: number, negMarks: number }> = {};
          
          allAnswers?.forEach((ans: any) => {
              if (!statsMap[ans.submission_id]) {
                  statsMap[ans.submission_id] = { correct: 0, wrong: 0, negMarks: 0 };
              }
              
              if (ans.is_correct) {
                  statsMap[ans.submission_id].correct++;
              } else if (ans.selected_option) {
                   statsMap[ans.submission_id].wrong++;
                   const marks = Number(ans.marks_obtained);
                   if (marks < 0) {
                       statsMap[ans.submission_id].negMarks += Math.abs(marks);
                   }
              }
          });

          // 4. Generate PDF using Chunked html2canvas
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          const ROWS_PER_PAGE = 25;
          const totalPages = Math.ceil(submissions.length / ROWS_PER_PAGE);
          const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

          // Create a hidden container for rendering
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.style.width = '800px'; // Fixed width for consistent scaling
          container.style.backgroundColor = '#ffffff';
          container.style.fontFamily = "'Noto Sans Bengali', 'Inter', sans-serif";
          document.body.appendChild(container);

          for (let page = 0; page < totalPages; page++) {
              const startIdx = page * ROWS_PER_PAGE;
              const endIdx = startIdx + ROWS_PER_PAGE;
              const pageSubmissions = submissions.slice(startIdx, endIdx);

              // Build Table Headers based on Config
              let tableHeaders = '';
              if (downloadConfig.rank) tableHeaders += `<th style="padding: 10px; text-align: center; width: 50px; border-radius: 6px 0 0 6px;">Rank</th>`;
              tableHeaders += `<th style="padding: 10px; text-align: left;">Student Name</th>`;
              if (downloadConfig.correct) tableHeaders += `<th style="padding: 10px; text-align: center;">Correct</th>`;
              if (downloadConfig.wrong) tableHeaders += `<th style="padding: 10px; text-align: center;">Wrong</th>`;
              if (downloadConfig.negative) tableHeaders += `<th style="padding: 10px; text-align: center;">Neg. Marks</th>`;
              if (downloadConfig.timeTaken) tableHeaders += `<th style="padding: 10px; text-align: center;">Time Taken</th>`;
              if (downloadConfig.total) tableHeaders += `<th style="padding: 10px; text-align: right; border-radius: 0 6px 6px 0;">Total Score</th>`;

              // Construct HTML for this page
              container.innerHTML = `
                <div style="padding: 40px; background: white; color: #111; min-height: 1100px; position: relative;">
                    <!-- Header -->
                    <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #1F2937; line-height: 1.2;">RESULT SHEET</h1>
                            <p style="font-size: 12px; color: #6B7280; margin-top: 5px; font-weight: 500;">Generated on ${dateStr}</p>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #2563EB;">${examTitle}</h2>
                            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #4B5563;">
                                <span style="background: #EFF6FF; color: #2563EB; padding: 3px 8px; rounded: 4px;">Total: ${examData?.total_marks || '-'}</span>
                                <span style="background: #FEF2F2; color: #DC2626; padding: 3px 8px; rounded: 4px;">Neg: ${negativeRate}%</span>
                                <span style="background: #F3F4F6; color: #374151; padding: 3px 8px; rounded: 4px;">Time: ${examData?.duration_minutes}m</span>
                            </div>
                        </div>
                    </div>

                    <!-- Table -->
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #1F2937; color: white; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody>
                            ${pageSubmissions.map((sub, i) => {
                                const globalIndex = startIdx + i;
                                const stat = statsMap[sub.id] || { correct: 0, wrong: 0, negMarks: 0 };
                                const timeTaken = sub.time_taken ? `${Math.floor(sub.time_taken / 60)}m ${sub.time_taken % 60}s` : '-';
                                const isEven = i % 2 === 0;
                                
                                let rankColor = '#111';
                                if (globalIndex === 0) rankColor = '#EAB308';
                                else if (globalIndex === 1) rankColor = '#9CA3AF';
                                else if (globalIndex === 2) rankColor = '#F97316';

                                let rowCells = '';
                                if (downloadConfig.rank) rowCells += `<td style="padding: 10px; text-align: center; font-weight: 800; color: ${rankColor};">#${globalIndex + 1}</td>`;
                                rowCells += `<td style="padding: 10px; font-weight: 600; color: #374151;">${sub.student_name}</td>`;
                                if (downloadConfig.correct) rowCells += `<td style="padding: 10px; text-align: center; color: #16A34A; font-weight: 700;">${stat.correct}</td>`;
                                if (downloadConfig.wrong) rowCells += `<td style="padding: 10px; text-align: center; color: #DC2626; font-weight: 700;">${stat.wrong}</td>`;
                                if (downloadConfig.negative) rowCells += `<td style="padding: 10px; text-align: center; color: #DC2626;">-${stat.negMarks.toFixed(2)}</td>`;
                                if (downloadConfig.timeTaken) rowCells += `<td style="padding: 10px; text-align: center; color: #6B7280;">${timeTaken}</td>`;
                                if (downloadConfig.total) rowCells += `<td style="padding: 10px; text-align: right; font-weight: 800; font-size: 12px; color: #2563EB;">${Number(sub.obtained_marks).toFixed(2)}</td>`;

                                return `
                                    <tr style="border-bottom: 1px solid #E5E7EB; background: ${isEven ? '#fff' : '#F9FAFB'};">
                                        ${rowCells}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <!-- Footer -->
                    <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; border-top: 1px solid #E5E7EB; padding-top: 10px; display: flex; justify-content: space-between; color: #9CA3AF; font-size: 9px; text-transform: uppercase;">
                        <span>Powered by EXAMiO</span>
                        <span>Page ${page + 1} of ${totalPages}</span>
                    </div>
                </div>
              `;

              // Render
              const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
              const imgData = canvas.toDataURL('image/jpeg', 0.9);
              
              if (page > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
              
              // Update toast progress
              toast.loading(`Generating Page ${page + 1}/${totalPages}...`, { id: toastId });
          }

          document.body.removeChild(container);
          pdf.save(`Result_Sheet_${examTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
          toast.success("Result Sheet Downloaded!", { id: toastId });

      } catch (err: any) {
          console.error("PDF generation failed:", err);
          toast.error("Failed to generate PDF: " + err.message, { id: toastId });
      } finally {
          setIsDownloading(false);
      }
  };

  const openStudentDetail = async (sub: any) => {
    setSelectedSub(sub);
    setLoadingDetail(true);
    
    const { data } = await supabase
      .from('student_answers')
      .select(`
        *,
        questions (
          question_text,
          question_type,
          correct_answer,
          marks
        )
      `)
      .eq('submission_id', sub.id);
      
    if (data) {
        setStudentAnswers(data);
        // Init marks state
        const marks: Record<string, number> = {};
        data.forEach((ans: any) => {
            marks[ans.id] = ans.marks_obtained;
        });
        setManualMarks(marks);
    }
    setLoadingDetail(false);
  };

  const saveGrades = async () => {
     let newTotal = 0;
     const updates = Object.keys(manualMarks).map(async (ansId) => {
         const m = manualMarks[ansId];
         newTotal += m;
         return supabase.from('student_answers').update({ marks_obtained: m }).eq('id', ansId);
     });

     await Promise.all(updates);
     
     // Update Total in Submission
     await supabase
        .from('student_submissions')
        .update({ obtained_marks: newTotal, status: 'checked' })
        .eq('id', selectedSub.id);
        
     toast.success('রেজাল্ট আপডেট হয়েছে');
     
     // Update local state
     setSubmissions(submissions.map(s => s.id === selectedSub.id ? { ...s, obtained_marks: newTotal, status: 'checked' } : s));
     setSelectedSub(null);
  };

  const filteredSubs = submissions.filter(s => 
     s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.student_roll.includes(searchTerm)
  );

  const top3 = filteredSubs.slice(0, 3);

  // Helper to get rank styles
  const getRankBadge = (idx: number) => {
      if (idx === 0) return <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm shadow-yellow-200"><Trophy size={14} fill="currentColor" /></div>
      if (idx === 1) return <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shadow-sm"><Medal size={14} /></div>
      if (idx === 2) return <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm"><Medal size={14} /></div>
      return <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 flex items-center justify-center font-bold text-xs">#{idx + 1}</div>
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 relative">
       
       {/* Sticky Glass Header */}
       <div className="sticky top-0 z-40 bg-[#F5F5F7]/95 dark:bg-black/95 backdrop-blur-xl -mx-4 px-4 md:-mx-8 md:px-8 py-3 border-b border-gray-200/50 dark:border-white/5 shadow-sm transition-all">
           <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <div className="flex items-center gap-3 w-full md:w-auto">
                   <button onClick={onBack} className="p-2 bg-white dark:bg-white/10 hover:bg-gray-100 rounded-full transition-colors shadow-sm">
                       <ArrowLeft className="text-[#1D1D1F] dark:text-white" size={18} />
                   </button>
                   <div className="flex-1 min-w-0">
                       <h2 className="text-base md:text-xl font-bold dark:text-white truncate">{examTitle}</h2>
                       <p className="text-gray-500 text-[10px] md:text-xs font-medium">লিডারবোর্ড • {submissions.length} জন শিক্ষার্থী</p>
                   </div>
               </div>
               
               <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative w-full md:w-64 group">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                       <input 
                          type="text" 
                          placeholder="নাম বা রোল..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full h-9 md:h-10 pl-9 pr-4 rounded-xl bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 focus:border-primary/30 outline-none text-sm dark:text-white transition-all shadow-sm"
                       />
                   </div>
                   
                   <button 
                      onClick={() => setShowDownloadModal(true)}
                      disabled={isDownloading}
                      className="h-9 md:h-10 px-4 bg-primary text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-70 whitespace-nowrap"
                   >
                      {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                      <span className="hidden sm:inline">Result Sheet</span>
                   </button>
               </div>
           </div>
       </div>

       {/* Download Configuration Modal */}
       {showDownloadModal && (
           <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 p-4">
               <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                       <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">Download Options</h3>
                       <button onClick={() => setShowDownloadModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                           <X size={20} className="text-gray-500" />
                       </button>
                   </div>
                   
                   <div className="p-6 space-y-4">
                       <p className="text-sm text-gray-500 mb-4">Select columns to include in the result sheet:</p>
                       
                       <div className="grid grid-cols-2 gap-4">
                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.rank}
                                   onChange={e => setDownloadConfig({...downloadConfig, rank: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Rank</span>
                           </label>

                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.total}
                                   onChange={e => setDownloadConfig({...downloadConfig, total: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Total Score</span>
                           </label>

                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.correct}
                                   onChange={e => setDownloadConfig({...downloadConfig, correct: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Correct Ans</span>
                           </label>

                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.wrong}
                                   onChange={e => setDownloadConfig({...downloadConfig, wrong: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Wrong Ans</span>
                           </label>

                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.negative}
                                   onChange={e => setDownloadConfig({...downloadConfig, negative: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Negative Mark</span>
                           </label>

                           <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <input 
                                   type="checkbox" 
                                   checked={downloadConfig.timeTaken}
                                   onChange={e => setDownloadConfig({...downloadConfig, timeTaken: e.target.checked})}
                                   className="w-5 h-5 rounded text-primary focus:ring-primary"
                               />
                               <span className="font-medium text-sm dark:text-white">Time Taken</span>
                           </label>
                       </div>
                   </div>

                   <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                       <button 
                           onClick={() => setShowDownloadModal(false)}
                           className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={downloadResultSheet}
                           className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all flex items-center gap-2"
                       >
                           <Download size={16} /> Download PDF
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Podium Section (Responsive) */}
       {filteredSubs.length >= 3 && !searchTerm && (
           <div className="flex justify-center items-end gap-3 md:gap-6 mb-8 md:mb-12 pt-4">
               {/* 2nd Place */}
               <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-8 duration-700 delay-100 w-1/3 md:w-auto">
                   <div className="text-center w-full">
                       <h4 className="font-bold text-[#1D1D1F] dark:text-white text-xs md:text-base truncate px-1">{top3[1].student_name}</h4>
                       <p className="text-[10px] md:text-xs text-gray-500 font-mono">{top3[1].obtained_marks}</p>
                   </div>
                   <div className="w-full md:w-32 h-24 md:h-32 bg-gradient-to-b from-gray-200 to-gray-400 rounded-t-xl md:rounded-t-2xl flex items-start justify-center pt-3 relative shadow-lg">
                       <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center text-sm md:text-xl font-bold text-gray-500 shadow-sm border-2 md:border-4 border-gray-100">2</div>
                   </div>
               </div>
               
               {/* 1st Place */}
               <div className="flex flex-col items-center gap-2 z-10 -mt-6 md:-mt-8 animate-in slide-in-from-bottom-12 duration-700 w-1/3 md:w-auto">
                   <Crown className="text-yellow-500 fill-yellow-500 animate-bounce w-6 h-6 md:w-8 md:h-8" />
                   <div className="text-center w-full">
                       <h4 className="text-sm md:text-xl font-bold text-[#1D1D1F] dark:text-white truncate px-1">{top3[0].student_name}</h4>
                       <p className="text-xs md:text-sm font-bold text-primary">{top3[0].obtained_marks}</p>
                   </div>
                   <div className="w-full md:w-40 h-32 md:h-44 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-t-2xl md:rounded-t-3xl flex items-start justify-center pt-4 md:pt-6 relative shadow-2xl shadow-yellow-500/20">
                       <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center text-xl md:text-3xl font-bold text-yellow-600 shadow-sm border-2 md:border-4 border-yellow-100">1</div>
                   </div>
               </div>

               {/* 3rd Place */}
               <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-8 duration-700 delay-200 w-1/3 md:w-auto">
                   <div className="text-center w-full">
                       <h4 className="font-bold text-[#1D1D1F] dark:text-white text-xs md:text-base truncate px-1">{top3[2].student_name}</h4>
                       <p className="text-[10px] md:text-xs text-gray-500 font-mono">{top3[2].obtained_marks}</p>
                   </div>
                   <div className="w-full md:w-32 h-16 md:h-24 bg-gradient-to-b from-orange-300 to-orange-600 rounded-t-xl md:rounded-t-2xl flex items-start justify-center pt-3 relative shadow-lg">
                       <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center text-sm md:text-xl font-bold text-orange-600 shadow-sm border-2 md:border-4 border-orange-100">3</div>
                   </div>
               </div>
           </div>
       )}

       {/* Results List */}
       <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl md:rounded-[32px] shadow-xl shadow-black/5 border border-gray-100 dark:border-white/5 overflow-hidden">
           {/* Desktop Table Header */}
           <div className="hidden md:grid grid-cols-12 gap-4 p-5 bg-gray-50/50 dark:bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
               <div className="col-span-1 text-center">Rank</div>
               <div className="col-span-4">Student</div>
               <div className="col-span-2">Roll</div>
               <div className="col-span-3">Performance</div>
               <div className="col-span-2 text-right">Action</div>
           </div>

           <div className="divide-y divide-gray-100 dark:divide-white/5">
               {loading ? (
                   <div className="p-10 text-center flex flex-col items-center gap-3">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                       <p className="text-gray-400 font-medium">Loading results...</p>
                   </div>
               ) : filteredSubs.length === 0 ? (
                   <div className="p-10 text-center text-gray-400">No results found matching your search.</div>
               ) : (
                   filteredSubs.map((sub, idx) => (
                       <div 
                           key={sub.id} 
                           className={`group transition-colors hover:bg-gray-50 dark:hover:bg-white/5 
                           ${idx < 3 ? 'bg-gradient-to-r from-transparent to-transparent' : ''}
                           `}
                       >
                           {/* Desktop Row */}
                           <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                               <div className="col-span-1 flex justify-center">
                                   {getRankBadge(idx)}
                               </div>
                               <div className="col-span-4">
                                   <h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm">{sub.student_name}</h4>
                                   <p className="text-[10px] text-gray-400">{new Date(sub.created_at).toLocaleDateString()}</p>
                               </div>
                               <div className="col-span-2 font-mono text-sm text-gray-500">{sub.student_roll}</div>
                               <div className="col-span-3">
                                   <div className="flex items-center gap-3">
                                       <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                           <div 
                                              className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-primary'}`} 
                                              style={{ width: `${(sub.obtained_marks / (sub.total_marks || maxScore)) * 100}%` }}
                                           ></div>
                                       </div>
                                       <span className="font-bold text-sm text-[#1D1D1F] dark:text-white w-16 text-right">
                                           {Number(sub.obtained_marks).toFixed(1)}
                                       </span>
                                   </div>
                               </div>
                               <div className="col-span-2 text-right">
                                   <button 
                                      onClick={() => openStudentDetail(sub)}
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl text-xs font-bold transition-all active:scale-95"
                                   >
                                       <Eye size={14} /> View
                                   </button>
                               </div>
                           </div>

                           {/* Mobile Card Row */}
                           <div className="md:hidden p-3 flex items-center gap-3">
                               <div className="shrink-0 flex items-center justify-center w-8">
                                   {getRankBadge(idx)}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-center mb-1 gap-2">
                                       <h4 className="font-bold text-[#1D1D1F] dark:text-white text-sm truncate">{sub.student_name}</h4>
                                       <span className="font-mono text-[10px] text-gray-400 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0">{sub.student_roll}</span>
                                   </div>
                                   
                                   <div className="flex items-center gap-2 mt-1.5">
                                       <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                           <div 
                                              className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-primary'}`} 
                                              style={{ width: `${(sub.obtained_marks / (sub.total_marks || maxScore)) * 100}%` }}
                                           ></div>
                                       </div>
                                       <span className="font-bold text-xs text-[#1D1D1F] dark:text-white whitespace-nowrap">
                                           {Number(sub.obtained_marks).toFixed(1)} <span className="text-gray-400 text-[10px]">/ {sub.total_marks}</span>
                                       </span>
                                   </div>
                               </div>
                               <button 
                                  onClick={() => openStudentDetail(sub)}
                                  className="shrink-0 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-primary transition-colors active:bg-gray-200"
                               >
                                   <Eye size={16} />
                               </button>
                           </div>
                       </div>
                   ))
               )}
           </div>
       </div>

       {/* Student Detail Modal */}
       {selectedSub && (
           <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
               <div className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] h-full shadow-2xl overflow-y-auto p-0 flex flex-col animate-in slide-in-from-right duration-300">
                   
                   {/* Modal Header */}
                   <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-start justify-between bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur sticky top-0 z-20">
                       <div>
                           <h3 className="text-2xl font-bold dark:text-white">{selectedSub.student_name}</h3>
                           <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                               <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded font-mono text-[#1D1D1F] dark:text-gray-300">Roll: {selectedSub.student_roll}</span>
                               <span>•</span>
                               <span>{new Date(selectedSub.created_at).toLocaleString()}</span>
                           </div>
                       </div>
                       <button onClick={() => setSelectedSub(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                   </div>

                   {loadingDetail ? (
                       <div className="flex-1 flex flex-col items-center justify-center gap-3">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                           <p className="text-gray-400">Fetching answers...</p>
                       </div>
                   ) : (
                       <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                           {/* Summary Stats */}
                           <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                                   <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Obtained</p>
                                   <p className="text-3xl font-black text-green-700 dark:text-green-400">{Object.values(manualMarks).reduce((a: number, b: number) => a + b, 0)}</p>
                               </div>
                               <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                                   <p className="text-3xl font-black text-[#1D1D1F] dark:text-white">{selectedSub.total_marks}</p>
                               </div>
                           </div>

                           {studentAnswers.map((ans, i) => (
                               <div key={ans.id} className="p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#252527] shadow-sm">
                                   <div className="flex justify-between items-start mb-4">
                                       <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-sm text-gray-500">Q{i+1}</span>
                                       <span className="text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-1 rounded">Max: {ans.questions.marks}</span>
                                   </div>
                                   
                                   <h4 className="mb-4 font-medium dark:text-white text-lg leading-snug">
                                       <LatexText text={ans.questions.question_text} />
                                   </h4>

                                   <div className="mb-4">
                                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Student Answer</p>
                                       {ans.questions.question_type === 'mcq' ? (
                                           <div className={`p-3 rounded-xl border flex items-center justify-between ${ans.is_correct ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-300'}`}>
                                               <span className="font-medium">{ans.selected_option}</span>
                                               {ans.is_correct 
                                                 ? <span className="text-xs font-bold bg-green-200 dark:bg-green-900/40 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={12} /> Correct</span> 
                                                 : <span className="text-xs font-bold bg-red-200 dark:bg-red-900/40 px-2 py-1 rounded flex items-center gap-1"><AlertCircle size={12} /> Wrong</span>
                                               }
                                           </div>
                                       ) : (
                                           <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-white/5 text-sm whitespace-pre-wrap dark:text-white font-medium">
                                               {ans.attachment_url ? (
                                                   <div className="mb-2">
                                                       <img 
                                                          src={ans.attachment_url.startsWith('http') ? ans.attachment_url : `data:image/png;base64,${ans.attachment_url.split(',').pop()}`}
                                                          className="max-h-64 rounded-lg border dark:border-white/10" 
                                                          alt="Answer" 
                                                        />
                                                   </div>
                                               ) : null}
                                               {ans.text_answer || <span className="text-gray-400 italic">No text answer provided</span>}
                                           </div>
                                       )}
                                   </div>
                                   
                                   {!ans.is_correct && ans.questions.question_type === 'mcq' && (
                                       <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-xl">
                                           <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Correct Answer</p>
                                           <p className="text-green-800 dark:text-green-300 font-bold"><LatexText text={ans.questions.correct_answer} /></p>
                                       </div>
                                   )}

                                   <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                                       <label className="text-xs font-bold text-gray-400 uppercase">Marks Given</label>
                                       <input 
                                          type="number" 
                                          value={manualMarks[ans.id] || 0}
                                          onChange={e => setManualMarks({...manualMarks, [ans.id]: parseFloat(e.target.value)})}
                                          className="w-20 h-10 px-3 border border-gray-200 dark:border-white/10 rounded-lg text-right font-bold text-lg bg-white dark:bg-black dark:text-white focus:border-primary outline-none transition-all"
                                       />
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}

                   <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E] sticky bottom-0 flex justify-end gap-3 z-20 pb-8 md:pb-4 safe-area-bottom">
                       <button onClick={() => setSelectedSub(null)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                       <button onClick={saveGrades} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2 active:scale-95">
                           <Save size={18} /> Save Changes
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
