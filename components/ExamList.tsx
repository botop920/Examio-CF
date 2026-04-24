
import React, { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Pause, Edit, Trash2, Calendar, Clock, X, Save, Timer, Filter, Users, Loader2, Eye, AlertTriangle, Award, Hourglass, CheckSquare, Type, Share2, BarChart2, Bot, UserCheck, FileDown, Settings, Columns, AlignJustify, Maximize, FileText, Grid, ScanLine, Upload, CheckCircle2, XCircle, Plus, Layers, FileCheck } from 'lucide-react';
import { StudentPreview } from './StudentPreview';
import { ShareModal } from './ShareModal';
import toast from 'react-hot-toast';
import katex from 'katex';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExamListProps {
    onViewResults?: (examId: string) => void;
    onViewOmr?: (examId: string) => void;
    userId?: string;
}

export const ExamList: React.FC<ExamListProps> = ({ onViewResults, onViewOmr, userId }) => {
  // ... state declarations ...
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [previewExam, setPreviewExam] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [editingExam, setEditingExam] = useState<any>(null);
  const [shareExam, setShareExam] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  
  // Download & PDF Config State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingSolutionId, setDownloadingSolutionId] = useState<string | null>(null);
  const [pdfExam, setPdfExam] = useState<any>(null); 
  const [pdfConfig, setPdfConfig] = useState({
      customTitle: '',
      customTime: '',
      customMarks: '',
      layout: '1col', // '1col' | '2col'
      showAnswerGap: false,
      questionsPerPage: 0, // 0 means auto
      includeOmr: false, // New State
      watermarkText: '', // New Watermark State
  });
  
  // Merge State
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergeSearch, setMergeSearch] = useState('');

  // Edit States
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPerQuestion, setEditPerQuestion] = useState('');
  const [editDefaultMarks, setEditDefaultMarks] = useState('');

  // Global Timer for Countdowns (Optimized)
  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 30000); // Check every 30s for higher accuracy
      return () => clearInterval(timer);
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

              // Case 1: Scheduled exam (draft) should go live
              if (exam.status === 'draft' && startTime && now >= startTime && (!endTime || now < endTime)) {
                  newStatus = 'published';
              }

              // Case 2: Live exam should end
              if (exam.status === 'published' && endTime && now >= endTime) {
                  newStatus = 'completed';
              }

              // Case 3: Completed exam should go live (Reactivation)
              if (exam.status === 'completed' && endTime && now < endTime) {
                  newStatus = 'published';
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
                  fetchExams(); // Revert on failure
              });
          }
      };

      const intervalId = setInterval(checkExamStatuses, 30000); // Check every 30 seconds

      return () => clearInterval(intervalId);
  }, [exams]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('exams')
      .select('*, student_submissions(id)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExams(data);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      setExams(exams.map(e => e.id === id ? { ...e, status: newStatus } : e));
      await supabase.from('exams').update({ status: newStatus }).eq('id', id);
  };

  const toggleAiGrading = async (id: string, currentVal: boolean) => {
      const newVal = !currentVal;
      // Optimistic Update
      setExams(exams.map(e => e.id === id ? { ...e, ai_grading_enabled: newVal } : e));
      
      const { error } = await supabase.from('exams').update({ ai_grading_enabled: newVal }).eq('id', id);
      
      if (error) {
          toast.error('Failed to update settings');
          fetchExams(); // Revert
      } else {
          toast.success(newVal ? 'AI Grading Activated' : 'Switched to Manual Grading');
      }
  };

  const handleCancelSchedule = async (id: string) => {
      if (!confirm('Are you sure you want to cancel the schedule?')) return;
      setExams(exams.map(e => e.id === id ? { ...e, status: 'draft', start_time: null } : e));
      const { error } = await supabase.from('exams').update({ status: 'draft', start_time: null }).eq('id', id);
      if (error) { toast.error('Failed to cancel'); fetchExams(); } else { toast.success('Schedule cancelled'); }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExamToDelete(id);
  };

  const confirmDelete = async () => {
      if (!examToDelete) return;
      setDeletingId(examToDelete);
      try {
          // Relies on ON DELETE CASCADE in Postgres to remove questions and submissions
          const { error } = await supabase.from('exams').delete().eq('id', examToDelete);
          if (error) throw error;

          setExams(exams.filter(e => e.id !== examToDelete));
          toast.success('Exam deleted successfully');
      } catch (error: any) {
          console.error("Delete failed:", error);
          toast.error(`Delete failed: ${error.message}`);
      } finally {
          setDeletingId(null);
          setExamToDelete(null);
      }
  };

  const toLocalISO = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 16);
  };

  const openEditModal = (exam: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingExam(exam);
      setEditTitle(exam.title);
      setEditSubject(exam.subject);
      setEditStartTime(toLocalISO(exam.start_time));
      setEditEndTime(toLocalISO(exam.end_time));
      setEditDuration(exam.duration_minutes?.toString() || '30');
      setEditPerQuestion(exam.per_question_duration?.toString() || '');
      setEditDefaultMarks(exam.default_marks?.toString() || '1');
  };

  const handleUpdateExam = async () => {
      if (!editingExam) return;
      
      const startTime = editStartTime ? new Date(editStartTime) : null;
      const endTime = editEndTime ? new Date(editEndTime) : null;
      const now = new Date();

      let newStatus = editingExam.status;
      
      // Auto-publish logic on update
      if (startTime && now >= startTime && (!endTime || now < endTime)) {
          newStatus = 'published';
      } else if (endTime && now >= endTime) {
          newStatus = 'completed';
      }

      const updates = {
          title: editTitle,
          subject: editSubject,
          start_time: startTime ? startTime.toISOString() : null,
          end_time: endTime ? endTime.toISOString() : null,
          duration_minutes: parseInt(editDuration) || 30,
          per_question_duration: editPerQuestion ? parseInt(editPerQuestion) : null,
          default_marks: parseFloat(editDefaultMarks) || 1,
          status: newStatus
      };
      
      const { error } = await supabase.from('exams').update(updates).eq('id', editingExam.id);
      
      if (!error) {
          setExams(exams.map(e => e.id === editingExam.id ? { ...e, ...updates } : e));
          setEditingExam(null);
          toast.success('Updated successfully');
      } else {
          toast.error('Update failed');
      }
  };

  // --- DIRECT PDF GENERATION (CANVAS METHOD) ---
  
  const openPdfModal = (exam: any) => {
      setPdfExam(exam);
      setSelectedMergeIds([]); // Reset merge selection
      setMergeSearch('');
      // Reset config with defaults from exam
      setPdfConfig({
          customTitle: exam.title,
          customTime: exam.duration_minutes?.toString(),
          customMarks: '', // Calculated later or manual
          layout: '1col',
          showAnswerGap: false,
          questionsPerPage: 0,
          includeOmr: exam.type === 'mcq', // Default true for MCQ
          watermarkText: '', // Reset Watermark
      });
  };

  const toggleMergeExam = (id: string) => {
      setSelectedMergeIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const generateSolutionPdf = async (exam: any) => {
      if (!exam) return;
      setDownloadingSolutionId(exam.id);
      const toastId = toast.loading('Generating Solution Sheet...');

      try {
          // 1. Fetch Questions
          const { data: questions, error } = await supabase
              .from('questions')
              .select('*')
              .eq('exam_id', exam.id)
              .order('id', { ascending: true });

          if (error || !questions || questions.length === 0) {
              toast.error('No questions found', { id: toastId });
              setDownloadingSolutionId(null);
              return;
          }

          // 1. Base Styles
          const baseFontSize = 12;
          const baseGap = 12;
          const isTwoCol = pdfConfig.layout === '2col';

          // 2. Create Hidden DOM Container
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.style.width = '794px'; // A4 width
          container.style.backgroundColor = '#ffffff';
          container.style.color = '#000000';
          container.style.fontFamily = "'Noto Sans Bengali', 'Inter', sans-serif";
          (container.style as any).webkitFontSmoothing = "antialiased";
          document.body.appendChild(container);

          // Inject KaTeX stylesheet into container context
          const katexStyle = document.createElement('style');
          let katexCss = Array.from(document.styleSheets)
              .filter(s => { try { return s.href?.includes('katex'); } catch { return false; } })
              .flatMap(s => { try { return Array.from(s.cssRules).map(r => r.cssText); } catch { return []; } })
              .join('\n');
              
          // Fix html2canvas KaTeX rendering bugs (fraction line and root symbol going up)
          katexCss += `
              .katex .frac-line {
                  border-bottom: none !important;
                  background-color: currentColor !important;
                  height: 1px !important;
              }
              .katex .sqrt-line {
                  border-top: none !important;
                  background-color: currentColor !important;
                  height: 1px !important;
              }
              .katex {
                  line-height: 1.2 !important;
              }
              .katex .base { position: relative !important; display: inline-block !important; }
              .katex .vlist-t { display: inline-table !important; vertical-align: middle !important; }
              .katex .vlist-r { display: table-row !important; }
              .katex .vlist { display: table-cell !important; vertical-align: bottom !important; position: relative !important; }
          `;
          katexStyle.textContent = katexCss;
          container.appendChild(katexStyle);

          // Wait for fonts to fully load before html2canvas capture
          await document.fonts.ready;
          await new Promise(r => setTimeout(r, 300));

          // 3. Render Text Helper (LaTeX)
          const renderText = (text: string) => {
              if (!text) return '';
              const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
              const parts = text.split(regex);
              
              return parts.map(part => {
                  if (part.startsWith('$') || part.startsWith('\\(') || part.startsWith('\\[')) {
                      try {
                          let math = part;
                          let displayMode = false;
                          if (part.startsWith('$$')) { math = part.slice(2, -2); displayMode = true; }
                          else if (part.startsWith('$')) { math = part.slice(1, -1); displayMode = false; }
                          else if (part.startsWith('\\[')) { math = part.slice(2, -2); displayMode = true; }
                          else if (part.startsWith('\\(')) { math = part.slice(2, -2); displayMode = false; }
                          
                          // Clean up double backslashes that might come from JSON parsing
                          math = math.replace(/\\\\/g, '\\');
                          
                          return katex.renderToString(math, { 
                              throwOnError: false, 
                              displayMode, 
                              output: 'html',
                              strict: false,
                              trust: true
                          });
                      } catch (e) { return part; }
                  }
                  return part.replace(/\n/g, '<br/>');
              }).join('');
          };

          // 4. Render Item Function
          const renderItem = (q: any, qNum: number) => {
              const correctOption = q.options?.find((opt: string) => opt.trim() === q.correct_answer?.trim());
              const correctIndex = q.options?.indexOf(correctOption);
              
              const highlightBg = '#fef08a';
              const highlightBorder = '#eab308';
              const highlightText = '#854d0e';
              const explanationBg = '#f8fafc';
              const explanationBorder = '#cbd5e1';

              let optionsHtml = '';
              if (q.question_type === 'mcq' && q.options) {
                  optionsHtml = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-left: 16px; font-size: ${baseFontSize - 1}px; margin-bottom: 8px;">
                      ${q.options.map((opt: string, idx: number) => {
                          const isCorrect = idx === correctIndex;
                          // Use single quotes to avoid backtick hell
                          const containerStyle = isCorrect 
                              ? 'background-color: ' + highlightBg + '; border: 1.5px solid ' + highlightBorder + '; border-radius: 6px; padding: 4px 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);' 
                              : 'padding: 4px 8px; border: 1.5px solid transparent;';
                          
                          const checkMark = isCorrect ? '<span style="font-weight: 900; color: #15803d; margin-left: 6px; flex-shrink: 0; font-size: ' + (baseFontSize + 2) + 'px;">✓</span>' : '';
                          const letterColor = isCorrect ? 'color: ' + highlightText + ';' : 'color: #475569;';
                          const textColor = isCorrect ? 'font-weight: 700; color: #000;' : 'color: #334155;';

                          return '<div style="display: flex; gap: 6px; align-items: flex-start; line-height: 1.3; ' + containerStyle + '">' +
                              '<span style="font-weight: 800; flex-shrink: 0; ' + letterColor + '">(' + String.fromCharCode(97 + idx) + ')</span>' +
                              '<div style="flex: 1; display: flex; justify-content: space-between; align-items: flex-start;">' +
                                  '<span style="word-break: break-word; ' + textColor + '">' + renderText(opt) + '</span>' +
                                  checkMark +
                              '</div>' +
                          '</div>';
                      }).join('')}
                  </div>`;
              }

              return `<div style="break-inside: avoid; page-break-inside: avoid; width: 100%; font-size: ${baseFontSize}px; margin-bottom: ${baseGap}px;">
                  <div style="font-weight: 700; margin-bottom: 6px; line-height: 1.5; text-align: justify; color: #1e293b;">
                      <span style="margin-right: 6px;">${qNum}.</span>${renderText(q.question_text)}
                  </div>
                  
                  ${optionsHtml}

                  ${q.explanation ? `
                    <div style="
                        font-size: ${baseFontSize - 1.5}px; 
                        color: #334155; 
                        background: ${explanationBg}; 
                        padding: 10px 12px; 
                        border-radius: 8px; 
                        margin-top: 8px; 
                        border: 1px solid ${explanationBorder};
                        border-left: 4px solid #3b82f6;
                        line-height: 1.5;
                        box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
                    ">
                      <strong style="color: #1e40af; display: block; margin-bottom: 4px; font-size: ${baseFontSize - 2}px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">Explanation:</strong> 
                      ${renderText(q.explanation)}
                  </div>` : ''}
              </div>`;
          };

          // 5. Measurement Phase
          const measureContainer = document.createElement('div');
          measureContainer.style.position = 'absolute';
          measureContainer.style.left = '-9999px';
          measureContainer.style.top = '0';
          measureContainer.style.width = isTwoCol ? '347px' : '714px'; // 794 - 80(padding) = 714. If 2 col, (714 - 20 gap) / 2 = 347
          measureContainer.style.backgroundColor = '#ffffff';
          measureContainer.style.fontFamily = "'Noto Sans Bengali', 'Inter', sans-serif";
          document.body.appendChild(measureContainer);

          const renderedItems = questions.map((q: any, i: number) => {
              const div = document.createElement('div');
              div.innerHTML = renderItem(q, i + 1);
              measureContainer.appendChild(div);
              return { q, html: div.innerHTML, el: div };
          });

          await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render

          // 6. Pagination
          const MAX_COL_HEIGHT = 980; // 1123(A4) - 80(padding) - 60(header/footer) = 983
          const pages: { col1: string[], col2: string[] }[] = [];
          let currentCol1: string[] = [];
          let currentCol2: string[] = [];
          let col1Height = 0;
          let col2Height = 0;

          for (const item of renderedItems) {
              const itemHeight = item.el.offsetHeight;
              
              // Safety fallback if a single item is larger than the page
              const effectiveHeight = Math.min(itemHeight, MAX_COL_HEIGHT);

              if (isTwoCol) {
                  if (col1Height + effectiveHeight <= MAX_COL_HEIGHT) {
                      currentCol1.push(item.html);
                      col1Height += effectiveHeight;
                  } else if (col2Height + effectiveHeight <= MAX_COL_HEIGHT) {
                      currentCol2.push(item.html);
                      col2Height += effectiveHeight;
                  } else {
                      pages.push({ col1: currentCol1, col2: currentCol2 });
                      currentCol1 = [item.html];
                      currentCol2 = [];
                      col1Height = effectiveHeight;
                      col2Height = 0;
                  }
              } else {
                  if (col1Height + effectiveHeight <= MAX_COL_HEIGHT) {
                      currentCol1.push(item.html);
                      col1Height += effectiveHeight;
                  } else {
                      pages.push({ col1: currentCol1, col2: [] });
                      currentCol1 = [item.html];
                      col1Height = effectiveHeight;
                  }
              }
          }
          if (currentCol1.length > 0 || currentCol2.length > 0) {
              pages.push({ col1: currentCol1, col2: currentCol2 });
          }

          document.body.removeChild(measureContainer);

          // 7. Generate HTML
          const htmlContent = pages.map((page, pageIdx) => {
              let bodyContent = '';
              if (isTwoCol) {
                  bodyContent = `
                  <div style="display: flex; gap: 20px; height: 100%; width: 100%; align-items: flex-start;">
                      <div style="flex: 1; display: flex; flex-direction: column;">
                          ${page.col1.join('')}
                      </div>
                      <div style="flex: 1; display: flex; flex-direction: column; border-left: 1px dashed #ccc; padding-left: 15px;">
                          ${page.col2.join('')}
                      </div>
                  </div>`;
              } else {
                  bodyContent = `<div style="display: flex; flex-direction: column;">
                      ${page.col1.join('')}
                  </div>`;
              }

              return `
              <div id="pdf-solution-page-${pageIdx}" class="pdf-page" style="width: 794px; height: 1123px; padding: 40px; background: white; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column;">
                  ${pdfConfig.watermarkText ? `
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: 800; color: rgba(0, 0, 0, 0.04); white-space: nowrap; pointer-events: none; z-index: 0; user-select: none; text-transform: uppercase; font-family: sans-serif;">
                      ${pdfConfig.watermarkText}
                  </div>
                  ` : ''}
                  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; flex-shrink: 0; position: relative; z-index: 1;">
                      <div style="font-size: 18px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Solution Sheet</div>
                      <div style="font-size: 13px; margin-top: 2px;">${exam.title}</div>
                      <div style="font-size: 11px; display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold;">
                          <span>${exam.subject} ${exam.batch ? `| Batch: ${exam.batch}` : ''}</span>
                      </div>
                  </div>
                  <div style="flex: 1; position: relative; z-index: 1;">
                      ${bodyContent}
                  </div>
                  <div style="position: absolute; bottom: 15px; left: 0; width: 100%; text-align: center; font-size: 9px; color: #666;">Page ${pageIdx + 1} of ${pages.length}</div>
              </div>`;
          }).join('');

          container.innerHTML = htmlContent;

          // 8. Load Images
          const images = container.getElementsByTagName('img');
          await Promise.all(Array.from(images).map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
          }));

          // 9. Generate PDF
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < pages.length; i++) {
              const pageId = `pdf-solution-page-${i}`;
              const pageEl = document.getElementById(pageId);
              if (!pageEl) continue;

              const canvas = await html2canvas(pageEl, {
                  scale: 3, 
                  useCORS: true, 
                  allowTaint: true,
                  logging: false,
                  windowWidth: 794, 
                  windowHeight: 1123,
                  onclone: (clonedDoc) => {
                      const link = clonedDoc.createElement('link');
                      link.rel = 'stylesheet';
                      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                      clonedDoc.head.appendChild(link);
                  }
              });

              const imgData = canvas.toDataURL('image/jpeg', 0.90);
              if (i > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          }

          pdf.save(`${exam.title.replace(/[^a-z0-9]/gi, '_')}_Solution.pdf`);
          toast.success('Solution Sheet Downloaded!', { id: toastId });
          
          document.body.removeChild(container);

      } catch (error: any) {
          console.error("Solution PDF Error:", error);
          toast.error("Failed: " + error.message, { id: toastId });
      } finally {
          setDownloadingSolutionId(null);
      }
  };

  const generateFinalPdf = async (action: 'preview' | 'download' = 'download') => {
      if (!pdfExam) return;
      setDownloadingId(pdfExam.id);
      const toastId = toast.loading(action === 'preview' ? 'Generating Preview...' : 'Generating PDF...');

      try {
          // 1. Prepare Exam List (Main + Merged)
          const allTargetExamIds = [pdfExam.id, ...selectedMergeIds];
          const printQueue: any[] = []; // Will hold { type: 'header' | 'question', data: ... }
          let globalTotalMarks = 0;

          // 2. Fetch and Process Each Exam Sequentially to preserve order
          for (const examId of allTargetExamIds) {
              const currentExamMeta = exams.find(e => e.id === examId);
              
              const { data: questions, error } = await supabase
                  .from('questions')
                  .select('*')
                  .eq('exam_id', examId)
                  .order('id', { ascending: true });

              if (error || !questions) continue;

              if (questions.length > 0) {
                  // Add Section Header
                  printQueue.push({
                      type: 'header',
                      text: `[ ${currentExamMeta?.subject || 'Subject'}  -  ${questions.length} Questions ]`,
                      meta: currentExamMeta
                  });

                  // Add Questions
                  questions.forEach((q: any) => {
                      printQueue.push({
                          type: 'question',
                          ...q
                      });
                      globalTotalMarks += (q.marks || 1);
                  });
              }
          }

          if (printQueue.length === 0) {
              toast.error('No questions found', { id: toastId });
              setDownloadingId(null);
              return;
          }

          const displayMarks = pdfConfig.customMarks || globalTotalMarks;

          // 3. Render Text Helper (LaTeX)
          const renderText = (text: string) => {
              if (!text) return '';
              const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
              const parts = text.split(regex);
              
              return parts.map(part => {
                  if (part.startsWith('$') || part.startsWith('\\(') || part.startsWith('\\[')) {
                      try {
                          let math = part;
                          let displayMode = false;
                          if (part.startsWith('$$')) { math = part.slice(2, -2); displayMode = true; }
                          else if (part.startsWith('$')) { math = part.slice(1, -1); displayMode = false; }
                          else if (part.startsWith('\\[')) { math = part.slice(2, -2); displayMode = true; }
                          else if (part.startsWith('\\(')) { math = part.slice(2, -2); displayMode = false; }
                          
                          // Clean up double backslashes that might come from JSON parsing
                          math = math.replace(/\\\\/g, '\\');
                          
                          return katex.renderToString(math, { 
                              throwOnError: false, 
                              displayMode, 
                              output: 'html',
                              strict: false,
                              trust: true
                          });
                      } catch (e) { return part; }
                  }
                  // Replace newlines with <br> for HTML rendering
                  return part.replace(/\n/g, '<br/>');
              }).join('');
          };

          // 4. Pagination Strategy (Smart Calculation)
          let qPerPage = pdfConfig.questionsPerPage;
          if (qPerPage === 0) {
              if (pdfConfig.showAnswerGap) {
                  qPerPage = 4; 
              } else {
                  // Default based on layout (Conservative default)
                  qPerPage = pdfConfig.layout === '2col' ? 24 : 12; 
              }
          }

          // Chunking logic needs to account for Headers taking up space
          const pages: any[][] = [];
          let currentPage: any[] = [];
          
          // Helper: Headers count as approx 2 question slots in terms of space
          let currentSlotsUsed = 0;
          
          printQueue.forEach((item) => {
              const slots = item.type === 'header' ? 2 : 1;
              
              if (currentSlotsUsed + slots > qPerPage) {
                  pages.push(currentPage);
                  currentPage = [];
                  currentSlotsUsed = 0;
              }
              currentPage.push(item);
              currentSlotsUsed += slots;
          });
          if (currentPage.length > 0) pages.push(currentPage);


          // 5. Create Hidden DOM Container
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.style.width = '794px'; // ~210mm width (A4 @ 96 DPI)
          // We don't limit height here, we let it expand to measure overflow
          container.style.backgroundColor = '#ffffff';
          container.style.color = '#000000';
          container.style.fontFamily = "'Noto Sans Bengali', 'Inter', sans-serif";
          (container.style as any).webkitFontSmoothing = "antialiased";
          document.body.appendChild(container);

          // Inject KaTeX stylesheet into container context
          const katexStyle = document.createElement('style');
          let katexCss = Array.from(document.styleSheets)
              .filter(s => { try { return s.href?.includes('katex'); } catch { return false; } })
              .flatMap(s => { try { return Array.from(s.cssRules).map(r => r.cssText); } catch { return []; } })
              .join('\n');
              
          // Fix html2canvas KaTeX rendering bugs (fraction line and root symbol going up)
          katexCss += `
              .katex .frac-line {
                  border-bottom: none !important;
                  background-color: currentColor !important;
                  height: 1px !important;
              }
              .katex .sqrt-line {
                  border-top: none !important;
                  background-color: currentColor !important;
                  height: 1px !important;
              }
              .katex {
                  line-height: 1.2 !important;
              }
              .katex .base { position: relative !important; display: inline-block !important; }
              .katex .vlist-t { display: inline-table !important; vertical-align: middle !important; }
              .katex .vlist-r { display: table-row !important; }
              .katex .vlist { display: table-cell !important; vertical-align: bottom !important; position: relative !important; }
          `;
          katexStyle.textContent = katexCss;
          container.appendChild(katexStyle);

          // Wait for fonts to fully load before html2canvas capture
          await document.fonts.ready;
          await new Promise(r => setTimeout(r, 300));

          // --- DYNAMIC FONT SCALING CALCULATOR ---
          const getPageStyles = (itemCount: number, layout: string) => {
              const isTwoCol = layout === '2col';
              
              // Effective number of items to fit vertically
              const effectiveVerticalCount = isTwoCol ? Math.ceil(itemCount / 2) : itemCount;
              
              // Total Usable Height (approx) - Optimized for filling page (1123 - 60px padding)
              const usableHeight = 1060; 
              
              // Height available per item slot
              const heightPerSlot = usableHeight / effectiveVerticalCount;
              
              // Font Size Heuristic
              let calculatedFontSize = Math.floor(heightPerSlot * 0.38);
              
              // Clamping
              calculatedFontSize = Math.max(9, Math.min(14, calculatedFontSize));
              
              // Gap Calculation
              let gap = Math.floor(heightPerSlot * 0.15);
              gap = Math.max(5, Math.min(25, gap));

              return { 
                  fontSize: calculatedFontSize, // Number for math
                  gap: gap, // Number for math
                  optGap: calculatedFontSize < 10 ? '2px' : '4px', 
                  lineHeight: calculatedFontSize < 11 ? '1.2' : '1.3', 
                  headerMargin: '10px', 
                  titleSize: calculatedFontSize < 11 ? '16px' : '20px' 
              };
          };

          // --- OMR Page Generation (Optional) ---
          const generateCompactOmrPage = () => {
              const columns = [0, 1, 2, 3];
              const renderColumn = (colIndex: number) => {
                  let html = `<div style="flex: 1; display: flex; flex-direction: column; gap: 7px; border-right: ${colIndex < 3 ? '1px dashed #ccc' : 'none'}; padding-right: ${colIndex < 3 ? '10px' : '0'}; padding-left: ${colIndex > 0 ? '10px' : '0'};">`;
                  const start = colIndex * 25 + 1;
                  const end = start + 24;
                  for(let i = start; i <= end; i++) {
                      html += `<div style="display: flex; align-items: center; justify-content: space-between;"><span style="font-weight: bold; width: 22px; text-align: right; font-size: 11px;">${i}.</span><div style="display: flex; gap: 6px;">${['A','B','C','D'].map(opt => `<div style="width: 18px; height: 18px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; line-height: 1;">${opt}</div>`).join('')}</div></div>`;
                  }
                  html += `</div>`;
                  return html;
              };
              return `<div id="pdf-omr-page" class="pdf-page" style="width: 794px; height: 1123px; padding: 30px; background: white; box-sizing: border-box; display: flex; flex-direction: column; align-items: center;"><div style="width: 100%; border: 3px solid #000; padding: 25px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; border-radius: 8px;"><div style="display: flex; gap: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px;"><div style="flex: 1;"><h1 style="font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase;">OMR Sheet</h1><p style="font-size: 11px; margin-bottom: 15px;">Use Black/Blue Ball Point Pen Only.</p><div style="margin-bottom: 10px;"><label style="font-weight: bold; font-size: 11px; display: block; margin-bottom: 2px; text-transform: uppercase;">Student Name</label><div style="border: 1px solid #000; height: 30px; border-radius: 4px;"></div></div><div style="margin-bottom: 10px;"><label style="font-weight: bold; font-size: 11px; display: block; margin-bottom: 2px; text-transform: uppercase;">Exam Title</label><div style="border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 14px; font-weight: 600;">${pdfConfig.customTitle}</div></div></div><div style="width: 180px; border: 1px solid #000; padding: 10px; border-radius: 4px;"><label style="font-weight: bold; font-size: 12px; display: block; margin-bottom: 5px; text-align: center;">ROLL NO</label><div style="display: flex; gap: 5px; justify-content: center;">${[1,2,3,4,5].map(() => `<div style="width: 20px; height: 20px; border: 1px solid #000; background: #eee;"></div>`).join('')}</div></div></div><div style="flex: 1; display: flex; gap: 15px;">${columns.map(c => renderColumn(c)).join('')}</div></div></div>`;
          };

          // --- Solution Sheet Page Generation ---
          // (Removed as we have a dedicated function now)

          // 6. Global Question Counter for Numbering
          let globalQIndex = 0;

          // 7. Generate HTML Pages
          let htmlContent = pages.map((pageItems: any[], pageIdx: number) => {
              // ... existing page generation code ...
              // Pass 'qPerPage' (the target) instead of pageItems.length to prevent font size jumping between pages
              const styles = getPageStyles(qPerPage, pdfConfig.layout);
              const isWrittenGapMode = pdfConfig.showAnswerGap; // Check this flag
              
              const renderItem = (item: any, forceFullWidth = false) => {
                  if (item.type === 'header') {
                      // Render Section Header
                      return `<div style="width: 100%; text-align: center; margin: 5px 0 5px 0; border: 1px solid #000; padding: 3px; border-radius: 4px; background: #f5f5f5; font-weight: bold; font-size: var(--pdf-font-size); text-transform: uppercase; break-inside: avoid; flex-shrink: 0;">${item.text}</div>`;
                  } else {
                      // Render Question
                      globalQIndex++;
                      const q = item;
                      const qNum = globalQIndex;
                      
                      if (isWrittenGapMode) {
                          // FLEX GROW MODE (Equal Split)
                          return `<div style="flex: 1; display: flex; flex-direction: column; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; min-height: 0;">
                              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; font-weight: 600;">
                                  <div style="flex: 1; margin-right: 5px; line-height: ${styles.lineHeight}; text-align: justify; word-break: break-word;">
                                      <span style="margin-right: 4px;">${qNum}.</span>${renderText(q.question_text)}
                                  </div>
                                  <div style="font-size: calc(var(--pdf-font-size) - 1px); white-space: nowrap;">[${q.marks || 1}]</div>
                              </div>
                              ${q.question_type === 'mcq' && q.options 
                                  ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${styles.optGap}; margin-left: 12px; font-size: calc(var(--pdf-font-size) - 1px); margin-bottom: 10px;">${q.options.map((opt: string, idx: number) => `<div style="display: flex; gap: 3px; align-items: flex-start; line-height: 1.2;"><span style="font-weight: bold; flex-shrink: 0;">(${String.fromCharCode(97 + idx)})</span><span style="word-break: break-word; overflow-wrap: anywhere; white-space: normal; flex: 1;">${renderText(opt)}</span></div>`).join('')}</div>` 
                                  : '' 
                              }
                              
                              <div style="flex: 1; border: 1px solid #eee; border-radius: 4px; width: 100%;"></div>
                          </div>`;
                      } else {
                          // STANDARD AUTO FLOW MODE
                          const marginStyle = `margin-bottom: 0;`; 
                          return `<div style="${marginStyle} break-inside: avoid; page-break-inside: avoid; width: 100%; font-size: var(--pdf-font-size);"><div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1px; font-weight: 600;"><div style="flex: 1; margin-right: 5px; line-height: ${styles.lineHeight}; text-align: justify; word-break: break-word;"><span style="margin-right: 4px;">${qNum}.</span>${renderText(q.question_text)}</div><div style="font-size: calc(var(--pdf-font-size) - 1px); white-space: nowrap;">[${q.marks || 1}]</div></div>${q.question_type === 'mcq' && q.options ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${styles.optGap}; margin-left: 12px; font-size: calc(var(--pdf-font-size) - 1px);">${q.options.map((opt: string, idx: number) => `<div style="display: flex; gap: 3px; align-items: flex-start; line-height: 1.2;"><span style="font-weight: bold; flex-shrink: 0;">(${String.fromCharCode(97 + idx)})</span><span style="word-break: break-word; overflow-wrap: anywhere; white-space: normal; flex: 1;">${renderText(opt)}</span></div>`).join('')}</div>` : ''}</div>`;
                      }
                  }
              };

              // Body Generation based on layout
              let bodyContent = '';
              
              if (pdfConfig.layout === '2col' && !isWrittenGapMode) {
                  const mid = Math.ceil(pageItems.length / 2); 
                  const col1 = pageItems.slice(0, mid); 
                  const col2 = pageItems.slice(mid);
                  
                  bodyContent = `
                    <div style="display: flex; gap: 20px; height: 100%; width: 100%; align-items: flex-start;">
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: var(--pdf-gap);">
                            ${col1.map(item => renderItem(item)).join('')}
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: var(--pdf-gap); border-left: 1px dashed #eee; padding-left: 15px;">
                            ${col2.map(item => renderItem(item)).join('')}
                        </div>
                    </div>`;
              } else {
                  // 1 Col
                  if (isWrittenGapMode) {
                      // Flex 1 to take up space after header
                      bodyContent = `<div style="flex: 1; display: flex; flex-direction: column; height: 100%;">${pageItems.map(item => renderItem(item)).join('')}</div>`;
                  } else {
                      bodyContent = `<div style="display: flex; flex-direction: column; gap: var(--pdf-gap); justify-content: flex-start;">${pageItems.map(item => renderItem(item)).join('')}</div>`;
                  }
              }

              // Apply CSS variables on the wrapper
              return `
              <div id="pdf-page-${pageIdx}" class="pdf-page" style="width: 794px; height: 1123px; padding: 30px 40px; background: white; box-sizing: border-box; position: relative; overflow: hidden; --pdf-font-size: ${styles.fontSize}px; --pdf-gap: ${styles.gap}px; display: flex; flex-direction: column;">
                  ${pdfConfig.watermarkText ? `
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 100px;
                        font-weight: 800;
                        color: rgba(0, 0, 0, 0.06);
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 0;
                        user-select: none;
                        text-transform: uppercase;
                        font-family: sans-serif;
                    ">
                        ${pdfConfig.watermarkText}
                    </div>
                  ` : ''}
                  <div id="pdf-content-${pageIdx}" style="display: flex; flex-direction: column; ${isWrittenGapMode ? 'flex: 1; height: 100%;' : ''} position: relative; z-index: 1;">
                      ${pageIdx === 0 ? `<div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: ${styles.headerMargin}; flex-shrink: 0;"><div style="font-size: ${styles.titleSize}; font-weight: bold; text-transform: uppercase; line-height: 1.2;">${pdfConfig.customTitle}</div><div style="font-size: 13px; margin-top: 2px;">Subject: ${pdfExam.subject} | Batch: ${pdfExam.batch || 'General'}</div><div style="font-size: 11px; display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold;"><span>Time: ${pdfConfig.customTime} Min</span><span>Marks: ${displayMarks}</span></div></div>` : '<div style="height: 20px;"></div>'}
                      
                      <div style="display: flex; flex-direction: column; ${isWrittenGapMode ? 'flex: 1;' : ''}">
                          ${bodyContent}
                      </div>
                  </div>
                  <div style="position: absolute; bottom: 15px; left: 0; width: 100%; text-align: center; font-size: 9px; color: #666;">Page ${pageIdx + 1} of ${pages.length}</div>
              </div>`;
          }).join('');

          // 8. OMR Page
          const includeOmr = pdfConfig.includeOmr && pdfExam.type === 'mcq';
          if (includeOmr) {
              htmlContent += generateCompactOmrPage();
          }

          container.innerHTML = htmlContent;

          // 9. Load Images
          const images = container.getElementsByTagName('img');
          await Promise.all(Array.from(images).map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
          }));

          // --- BI-DIRECTIONAL AUTO-FIT LOGIC ---
          const totalPdfPages = includeOmr ? pages.length + 1 : pages.length;
          
          for (let i = 0; i < pages.length; i++) { // Skip OMR for auto-fit logic
              const pageId = `pdf-page-${i}`;
              const contentId = `pdf-content-${i}`;
              const pageEl = document.getElementById(pageId);
              const contentEl = document.getElementById(contentId);
              
              if (!pageEl || !contentEl) continue;

              // Max height approx 1123 - 30px bottom padding - footer margin ~ 1060
              const MAX_CONTENT_HEIGHT = 1060; 
              // Target min height to force expansion
              const MIN_CONTENT_HEIGHT = 1040;
              // Safety max gap to prevent ridiculous spacing
              const MAX_GAP = 35; 

              let safetyCounter = 0;
              
              // Phase 1: Shrink if Overflow (Priority)
              while (contentEl.scrollHeight > MAX_CONTENT_HEIGHT && safetyCounter < 30) {
                  safetyCounter++;
                  const currentFont = parseFloat(pageEl.style.getPropertyValue('--pdf-font-size') || '12');
                  const currentGap = parseFloat(pageEl.style.getPropertyValue('--pdf-gap') || '5');
                  
                  if (currentFont <= 6) break; // Minimum threshold

                  const newFont = Math.max(6, currentFont - 0.2); // Slower shrink
                  const newGap = Math.max(2, currentGap - 0.5);
                  
                  pageEl.style.setProperty('--pdf-font-size', `${newFont}px`);
                  pageEl.style.setProperty('--pdf-gap', `${newGap}px`);
              }

              // Phase 2: Expand if Underflow (Too much white space)
              // Only if we haven't just shrunk it (safetyCounter == 0) AND NOT in written gap mode (because flex handles gap)
              if (safetyCounter === 0 && !pdfConfig.showAnswerGap) {
                  let expandCounter = 0;
                  // We expand gap primarily to push content down
                  while (contentEl.scrollHeight < MIN_CONTENT_HEIGHT && expandCounter < 40) {
                      expandCounter++;
                      const currentGap = parseFloat(pageEl.style.getPropertyValue('--pdf-gap') || '5');
                      
                      if (currentGap >= MAX_GAP) break; // Don't space out too much

                      const newGap = currentGap + 0.5;
                      pageEl.style.setProperty('--pdf-gap', `${newGap}px`);
                  }
              }
          }

          // 11. Generate PDF
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          // Reset Global Counter for rendering
          globalQIndex = 0; 

          // We need to iterate carefully because IDs are not sequential 0..N anymore due to OMR/Solution
          // Sequence: [Pages 0..N] -> [OMR (Optional)] -> [Solution Pages 0..M (Optional)]
          
          const pageIdsToCapture = [];
          for(let i=0; i<pages.length; i++) pageIdsToCapture.push(`pdf-page-${i}`);
          if(includeOmr) pageIdsToCapture.push('pdf-omr-page');

          for (let i = 0; i < pageIdsToCapture.length; i++) {
              const pageId = pageIdsToCapture[i];
              const pageEl = document.getElementById(pageId);
              if (!pageEl) continue;

              const canvas = await html2canvas(pageEl, {
                  scale: 2.5, 
                  useCORS: true, 
                  allowTaint: true,
                  logging: false,
                  windowWidth: 794, 
                  windowHeight: 1123,
                  onclone: (clonedDoc) => {
                      const link = clonedDoc.createElement('link');
                      link.rel = 'stylesheet';
                      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                      clonedDoc.head.appendChild(link);
                  }
              });

              const imgData = canvas.toDataURL('image/jpeg', 0.90);
              if (i > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          }

          if (action === 'download') {
              pdf.save(`${pdfConfig.customTitle.replace(/[^a-z0-9]/gi, '_') || 'Exam'}.pdf`);
              toast.success('PDF Downloaded!', { id: toastId });
          } else {
              const pdfBlob = pdf.output('blob');
              const blobUrl = URL.createObjectURL(pdfBlob);
              window.open(blobUrl, '_blank');
              toast.success('Preview Generated!', { id: toastId });
          }
          
          document.body.removeChild(container);

      } catch (error: any) {
          console.error("PDF Error:", error);
          toast.error("Failed to generate PDF: " + error.message, { id: toastId });
      } finally {
          setDownloadingId(null);
      }
  };

  const getBatchColor = (batch: string | null) => {
    if (!batch) return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300';
    const colors = ['bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300', 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300', 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300', 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300', 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300'];
    let hash = 0;
    for (let i = 0; i < batch.length; i++) hash = batch.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getCountdownString = (target: string) => {
      const diff = new Date(target).getTime() - now.getTime();
      if (diff <= 0) return '';
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  const batches = ['All', ...Array.from(new Set(exams.map(e => e.batch || 'Unassigned'))).filter(b => b !== 'All')];
  const filteredExams = selectedBatch === 'All' ? exams : exams.filter(e => (e.batch || 'Unassigned') === selectedBatch);

  // Available Exams for Merging (Excluding current)
  const mergeableExams = exams.filter(e => e.id !== pdfExam?.id && e.title.toLowerCase().includes(mergeSearch.toLowerCase()));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-20">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
          </div>
          <div className="h-10 w-40 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4 w-full">
                                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0"></div>
                                <div className="space-y-3 w-full">
                                    <div className="h-5 w-3/4 md:w-64 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                                    <div className="flex gap-2">
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-6 w-24 bg-gray-200 dark:bg-white/10 rounded-full shrink-0"></div>
                        </div>
                        <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex flex-wrap justify-end gap-3">
                            <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                            <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                            <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative animate-in fade-in duration-500 pb-20">
      {previewExam && <StudentPreview exam={previewExam} onClose={() => setPreviewExam(null)} />}
      {shareExam && <ShareModal exam={shareExam} onClose={() => setShareExam(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">আমার এক্সাম সমূহ</h2><p className="text-sm text-gray-500">মোট এক্সাম: {filteredExams.length}</p></div>
          <div className="flex items-center gap-3 bg-white dark:bg-[#1C1C1E] p-2 rounded-xl shadow-sm">
              <Filter size={16} className="text-gray-400 ml-2" />
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="bg-transparent border-none outline-none text-sm font-medium text-[#1D1D1F] dark:text-white cursor-pointer">{batches.map(b => <option key={b} value={b} className="bg-white dark:bg-[#1C1C1E]">{b === 'Unassigned' ? 'No Batch' : b}</option>)}</select>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {filteredExams.map((exam) => {
              const isFuture = exam.start_time && new Date(exam.start_time) > now;
              const hasEnded = exam.end_time && new Date(exam.end_time) < now;
              const isLive = exam.status === 'published' && !isFuture && !hasEnded;
              const submissionCount = exam.student_submissions?.length || 0;
              const countdown = isFuture ? getCountdownString(exam.start_time) : '';

              return (
                <div key={exam.id} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group border border-transparent hover:border-primary/10">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-xl font-bold transition-colors ${isLive ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>{exam.subject.substring(0, 2).toUpperCase()}</div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white break-words">{exam.title}</h3>
                                    <div className="flex flex-wrap gap-2 md:gap-3 mt-1 text-sm text-gray-500">
                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[10px] ${getBatchColor(exam.batch)}`}><Users size={12} /> {exam.batch || 'Gen'}</span>
                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded uppercase text-[10px] font-bold ${exam.type === 'mcq' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300'}`}>{exam.type === 'mcq' ? <CheckSquare size={12} /> : <Type size={12} />} {exam.type}</span>
                                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"><Clock size={12} /> {exam.duration_minutes}m</span>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"><UserCheck size={12} /> {submissionCount}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isLive && <span className="flex items-center gap-1 text-green-600 font-bold text-[10px] animate-pulse whitespace-nowrap bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">● LIVE NOW</span>}
                                {countdown && <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30 whitespace-nowrap"><Hourglass size={12} className="animate-[spin_3s_linear_infinite]" /> Live in: {countdown}</span>}
                            </div>
                        </div>

                        <div className="mt-2 pt-4 border-t border-gray-100 dark:border-white/5">
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                {/* OMR Check Button (Redirects to Full Page) */}
                                {exam.type === 'mcq' && onViewOmr && (
                                    <button 
                                        onClick={() => onViewOmr(exam.id)}
                                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black relative"
                                    >
                                        <ScanLine size={16} /> OMR Check
                                        <span className="absolute -top-2 -right-1 text-[8px] font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-1 rounded">BETA</span>
                                    </button>
                                )}

                                {/* AI Grading Toggle for Written Exams */}
                                {exam.type === 'written' && (
                                    <button 
                                        onClick={() => toggleAiGrading(exam.id, exam.ai_grading_enabled)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border ${exam.ai_grading_enabled ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10'}`}
                                    >
                                        <Bot size={16} className={exam.ai_grading_enabled ? 'text-purple-600 dark:text-purple-400' : ''} />
                                        {exam.ai_grading_enabled ? 'AI Check ON' : 'AI Check OFF'}
                                    </button>
                                )}

                                <button onClick={() => onViewResults && onViewResults(exam.id)} className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all"><BarChart2 size={16} /> রেজাল্ট</button>
                                <button onClick={() => setShareExam(exam)} className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"><Share2 size={16} /> শেয়ার</button>
                                
                                {isFuture ? <button onClick={() => handleCancelSchedule(exam.id)} className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all"><X size={14} /> Cancel Schedule</button> : <button onClick={() => toggleStatus(exam.id, exam.status)} className={`px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${exam.status === 'published' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{exam.status === 'published' ? <Pause size={14} /> : <Play size={14} />} {exam.status === 'published' ? 'বন্ধ করুন' : 'লাইভ করুন'}</button>}
                                <div className="h-6 w-px bg-gray-100 dark:bg-white/5 mx-1"></div>
                                {/* Updated Download Button Trigger */}
                                <button onClick={() => openPdfModal(exam)} title="Download Question Paper" className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                                    <FileDown size={18} />
                                </button>
                                <button onClick={() => setPreviewExam(exam)} title="Student View" className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-lg transition-colors"><Eye size={18} /></button>
                                <button onClick={(e) => openEditModal(exam, e)} className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors"><Edit size={18} /></button>
                                <button onClick={(e) => handleDeleteClick(exam.id, e)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    </div>
                </div>
              );
          })}
      </div>
      
      {/* PDF CONFIGURATION MODAL */}
      {pdfExam && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPdfExam(null)}></div>
              <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-lg p-6 rounded-[24px] relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                          <Settings size={20} className="text-gray-400" /> PDF Settings
                      </h3>
                      <button onClick={() => setPdfExam(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                  </div>

                  <div className="space-y-5">
                      {/* 1. Header Info */}
                      <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Exam Header</p>
                          <input 
                              type="text" 
                              value={pdfConfig.customTitle} 
                              onChange={(e) => setPdfConfig({...pdfConfig, customTitle: e.target.value})}
                              placeholder="Exam Title" 
                              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:border-primary"
                          />
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                  type="text" 
                                  value={pdfConfig.customTime} 
                                  onChange={(e) => setPdfConfig({...pdfConfig, customTime: e.target.value})}
                                  placeholder="Time (Min)" 
                                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:border-primary"
                              />
                              <input 
                                  type="text" 
                                  value={pdfConfig.customMarks} 
                                  onChange={(e) => setPdfConfig({...pdfConfig, customMarks: e.target.value})}
                                  placeholder="Total Marks (Auto)" 
                                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:border-primary"
                              />
                          </div>
                      </div>

                      {/* 2. Layout */}
                      <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page Layout</p>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                  onClick={() => setPdfConfig({...pdfConfig, layout: '1col'})}
                                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${pdfConfig.layout === '1col' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                              >
                                  <AlignJustify size={20} />
                                  <span className="text-xs font-bold">Standard (1 Col)</span>
                              </button>
                              <button 
                                  onClick={() => setPdfConfig({...pdfConfig, layout: '2col'})}
                                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${pdfConfig.layout === '2col' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                              >
                                  <Columns size={20} />
                                  <span className="text-xs font-bold">Two Columns</span>
                              </button>
                          </div>
                          
                          {/* Questions Per Page Input */}
                          <div className="flex items-center gap-3 mt-3">
                              <div className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-black/20">
                                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Questions / Page</span>
                                   <input
                                      type="number"
                                      min="0"
                                      value={pdfConfig.questionsPerPage || ''}
                                      onChange={(e) => setPdfConfig({...pdfConfig, questionsPerPage: parseInt(e.target.value) || 0})}
                                      placeholder="Auto"
                                      className="w-16 text-right bg-transparent outline-none text-sm font-bold text-[#1D1D1F] dark:text-white placeholder:text-gray-400 focus:text-primary"
                                   />
                              </div>
                          </div>
                      </div>

                      {/* 3. Merge Exams (NEW) */}
                      <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                              Merge with other exams
                              {selectedMergeIds.length > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">{selectedMergeIds.length} Selected</span>}
                          </p>
                          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                              <input 
                                  type="text" 
                                  placeholder="Search exams to merge..." 
                                  value={mergeSearch}
                                  onChange={(e) => setMergeSearch(e.target.value)}
                                  className="w-full h-9 px-3 rounded-lg bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs mb-2 outline-none focus:border-primary"
                              />
                              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                  {mergeableExams.length === 0 ? (
                                      <p className="text-center text-gray-400 text-xs py-2">No other exams found</p>
                                  ) : (
                                      mergeableExams.map(exam => (
                                          <div 
                                              key={exam.id} 
                                              onClick={() => toggleMergeExam(exam.id)}
                                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium ${selectedMergeIds.includes(exam.id) ? 'bg-primary/10 text-primary' : 'hover:bg-white dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                                          >
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedMergeIds.includes(exam.id) ? 'bg-primary border-primary text-white' : 'border-gray-400'}`}>
                                                  {selectedMergeIds.includes(exam.id) && <CheckSquare size={10} />}
                                              </div>
                                              <span className="truncate flex-1">{exam.title}</span>
                                              <span className="text-[10px] text-gray-400 bg-white dark:bg-black/20 px-1.5 rounded">{exam.subject}</span>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* 4. Options (Written / MCQ specific) */}
                      <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                          {/* Answer Gap (Written) */}
                          {pdfExam.type === 'written' && (
                            <div 
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${pdfConfig.showAnswerGap ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/20'}`}
                                onClick={() => setPdfConfig({...pdfConfig, showAnswerGap: !pdfConfig.showAnswerGap})}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${pdfConfig.showAnswerGap ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                        {pdfConfig.showAnswerGap && <CheckSquare size={14} />}
                                    </div>
                                    <span className="text-sm font-bold dark:text-white">Add Answer Space</span>
                                </div>
                            </div>
                          )}

                          {/* OMR Toggle (MCQ) */}
                          {pdfExam.type === 'mcq' && (
                            <div 
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${pdfConfig.includeOmr ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/20'}`}
                                onClick={() => setPdfConfig({...pdfConfig, includeOmr: !pdfConfig.includeOmr})}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${pdfConfig.includeOmr ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                        {pdfConfig.includeOmr && <CheckSquare size={14} />}
                                    </div>
                                    <span className="text-sm font-bold dark:text-white">Include OMR Sheet</span>
                                </div>
                                <ScanLine size={18} className="text-gray-400" />
                            </div>
                          )}

                          {/* Watermark Input */}
                          <div className="space-y-1 mt-3 pt-2 border-t border-gray-100 dark:border-white/5">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Watermark (Optional)</label>
                              <input 
                                  type="text" 
                                  value={pdfConfig.watermarkText || ''} 
                                  onChange={(e) => setPdfConfig({...pdfConfig, watermarkText: e.target.value})}
                                  placeholder="e.g. EXAMiO Confidential" 
                                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:border-primary"
                              />
                          </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3 mt-6 pt-5 border-t border-gray-100 dark:border-white/5">
                          <div className="grid grid-cols-2 gap-3">
                              <button
                                  onClick={() => generateFinalPdf('preview')}
                                  disabled={downloadingId === pdfExam.id}
                                  className="w-full py-3.5 bg-gray-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                              >
                                  {downloadingId === pdfExam.id ? <Loader2 className="animate-spin" size={18} /> : <Eye size={18} />} Preview Question
                              </button>
                              <button
                                  onClick={() => generateFinalPdf('download')}
                                  disabled={downloadingId === pdfExam.id}
                                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                              >
                                  {downloadingId === pdfExam.id ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />} Download Question
                              </button>
                          </div>
                          <button
                              onClick={() => generateSolutionPdf(pdfExam)}
                              disabled={downloadingSolutionId === pdfExam.id}
                              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:bg-green-400"
                          >
                              {downloadingSolutionId === pdfExam.id ? <Loader2 className="animate-spin" size={18} /> : <FileCheck size={18} />} Download Answer Sheet
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingExam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingExam(null)}></div>
              <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md p-6 rounded-[32px] relative z-10 shadow-2xl animate-[fadeIn_0.2s_ease-out] max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar">
                  <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-[#1C1C1E] z-10 pb-2 border-b border-gray-100 dark:border-white/5">
                      <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-white">এক্সাম এডিট করুন</h3>
                      <button onClick={() => setEditingExam(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="space-y-4 pt-2">
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="টাইটেল" className="w-full h-12 px-4 rounded-xl border dark:border-white/10 bg-transparent text-[#1D1D1F] dark:text-white outline-none focus:border-primary" />
                      <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="বিষয়" className="w-full h-12 px-4 rounded-xl border dark:border-white/10 bg-transparent text-[#1D1D1F] dark:text-white outline-none focus:border-primary" />
                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">শুরু (Schedule)</label><input type="datetime-local" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="w-full h-10 px-2 rounded-lg border dark:border-white/10 bg-transparent dark:text-white text-xs [color-scheme:light] dark:[color-scheme:dark]" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">শেষ</label><input type="datetime-local" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="w-full h-10 px-2 rounded-lg border dark:border-white/10 bg-transparent dark:text-white text-xs [color-scheme:light] dark:[color-scheme:dark]" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold text-gray-400 uppercase">সময় (মিনিট)</label><input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} placeholder="Duration" className="w-full h-10 px-3 rounded-lg border dark:border-white/10 bg-transparent text-[#1D1D1F] dark:text-white outline-none focus:border-primary text-sm" /></div>
                          <div><label className="text-[10px] font-bold text-gray-400 uppercase">মার্ক / প্রশ্ন</label><input type="number" value={editDefaultMarks} onChange={e => setEditDefaultMarks(e.target.value)} placeholder="Marks" className="w-full h-10 px-3 rounded-lg border dark:border-white/10 bg-transparent text-[#1D1D1F] dark:text-white outline-none focus:border-primary text-sm" /></div>
                      </div>
                      <button onClick={handleUpdateExam} className="w-full bg-primary text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 mt-4"><Save size={18} /> আপডেট করুন</button>
                  </div>
              </div>
          </div>
      )}

      {examToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletingId && setExamToDelete(null)}></div>
              <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm p-6 rounded-[24px] relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/5">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={24} /></div>
                  <h3 className="text-xl font-bold text-center text-[#1D1D1F] dark:text-white mb-2">এক্সাম ডিলিট করবেন?</h3>
                  <p className="text-gray-500 text-center text-sm mb-6">সতর্কতা: এটি ডিলিট করলে এই এক্সামের সকল প্রশ্ন এবং শিক্ষার্থীদের রেজাল্ট স্থায়ীভাবে মুছে যাবে।</p>
                  <div className="flex gap-3">
                      <button onClick={() => setExamToDelete(null)} disabled={!!deletingId} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50">বাতিল</button>
                      <button onClick={confirmDelete} disabled={!!deletingId} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{deletingId ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} ডিলিট</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
